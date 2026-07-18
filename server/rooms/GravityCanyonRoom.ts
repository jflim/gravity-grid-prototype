import { ArraySchema } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import type { CharacterId, VehicleId } from "../../shared/model/gameTypes.js";
import {
  activeSlotIdsForMode,
  assignLobbyRoles,
  canEditSlot,
  defaultCharacterForSlot,
  isReadyToAutoStart,
  sanitizeCharacterPick,
} from "./autoRoomLobby.js";
import {
  GravityCanyonState,
  LobbySlotState,
  PlayerState,
  type PlayerRole,
  type TeamId,
} from "../schema/GravityCanyonState.js";
import {
  mergeRoomSettings,
  sanitizeDisplayName,
  type GameMode,
  type RoomSettings,
} from "../v1/rules.js";
import {
  advanceTimedOutPreviewTurn,
  clearCombatPreview,
  previewAimForClient,
  previewFireForClient,
  previewMoveForClient,
  resetMatchForRematch,
  startCombatPreview,
  teamForSlot,
} from "./combatPreview.js";
import {
  acceptTurnIntentForClient,
  isValidFireIntentPayload,
  type SubmitTurnIntentMessage,
} from "./turnAuthority.js";

type JoinOptions = {
  displayName?: string;
};

type ReadyMessage = {
  ready?: boolean;
};

type EquipMessage = {
  nameplate?: string;
};

type ModeMessage = {
  mode?: GameMode;
};

type RoomSettingsMessage = Partial<Record<keyof RoomSettings, unknown>>;

type SelectCharacterMessage = {
  slotId?: VehicleId;
  characterId?: CharacterId;
};

type ClaimSeatMessage = {
  slotId?: VehicleId;
};

type LobbySeatContext = {
  player: PlayerState;
  slot: LobbySlotState;
  slotId: VehicleId;
};

type LobbySlotSyncContext = {
  activeSlotIds: Set<VehicleId>;
  liveSessionIds: Set<string>;
  seenOwners: Set<string>;
};

type TurnIntentHandler = (
  state: GravityCanyonState,
  sessionId: string,
  message: SubmitTurnIntentMessage,
) => void;

const cosmeticPool = [
  "Canyon Rookie",
  "Archshot Ace",
  "Spark Drifter",
  "Mesa Idol",
  "Cloudline Champ",
];
const LOBBY_SLOT_IDS: readonly VehicleId[] = ["red-1", "blue-1", "red-2", "blue-2"];
const DEFAULT_TURN_INTENT_HANDLER: TurnIntentHandler = (state, sessionId, message) => {
  acceptTurnIntentForClient(state, sessionId, message);
};
const SERVER_STATE_PATCH_INTERVAL_MS = 1000 / 60;
const SERVER_TURN_CLOCK_INTERVAL_MS = 250;
const TURN_INTENT_HANDLERS: Record<string, TurnIntentHandler> = {
  aim: (state, sessionId, message) => {
    previewAimForClient(state, sessionId, message);
  },
  move: (state, sessionId, message) => {
    previewMoveForClient(state, sessionId, message);
  },
  fire: (state, sessionId, message) => {
    if (isValidFireIntentPayload(message) && acceptTurnIntentForClient(state, sessionId, message)) {
      previewFireForClient(state, sessionId, {}, message);
    }
  },
};

export class GravityCanyonRoom extends Room<{ state: GravityCanyonState }> {
  maxClients = 8;
  private nextJoinOrder = 1;

  onCreate() {
    this.setState(new GravityCanyonState());
    this.state.roomCode = "auto-room";
    this.ensureLobbySlots();
    this.setPatchRate(SERVER_STATE_PATCH_INTERVAL_MS);
    this.setSimulationInterval(() => this.tickServerTurnClock(), SERVER_TURN_CLOCK_INTERVAL_MS);

    this.onMessage("setDisplayName", (client, displayName: string) =>
      this.handleDisplayName(client, displayName),
    );
    this.onMessage("setReady", (client, message: ReadyMessage) => this.handleReady(client, message));
    this.onMessage("setMode", (client, message: ModeMessage) => this.handleMode(client, message));
    this.onMessage("setRoomSettings", (client, message: RoomSettingsMessage) =>
      this.handleRoomSettings(client, message),
    );
    this.onMessage("claimSeat", (client, message: ClaimSeatMessage) => this.handleClaimSeat(client, message));
    this.onMessage("selectCharacter", (client, message: SelectCharacterMessage) =>
      this.handleSelectCharacter(client, message),
    );
    this.onMessage("claimTestCapsule", (client) => this.handleClaimTestCapsule(client));
    this.onMessage("equipNameplate", (client, message: EquipMessage) => this.handleEquipNameplate(client, message));
    this.onMessage("submitTurnIntent", (client, message: SubmitTurnIntentMessage) =>
      this.handleTurnIntent(client, message),
    );
    this.onMessage("previewFire", (client) => previewFireForClient(this.state, client.sessionId));
    this.onMessage("startNextRound", (client) => this.handleStartNextRound(client));
    this.onMessage("startRematch", (client) => this.handleStartRematch(client));

    this.refreshStatus();
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.displayName = sanitizeDisplayName(options.displayName);
    player.joinOrder = this.nextJoinOrder;
    this.nextJoinOrder += 1;
    player.inventory = new ArraySchema<string>("Canyon Rookie");
    player.equippedNameplate = "Canyon Rookie";

    this.state.players.set(client.sessionId, player);
    this.refreshStatus();
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.releaseSeatsForSession(client.sessionId);

    if (this.isGameplayPhase()) {
      this.state.phase = "lobby";
    }

    clearCombatPreview(this.state);
    this.refreshStatus();
  }

  private handleDisplayName(client: Client, displayName: string): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    player.displayName = sanitizeDisplayName(displayName);
    this.refreshStatus();
  }

  private handleReady(client: Client, message: ReadyMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || !this.canChangeReadiness(client.sessionId)) {
      return;
    }

    player.ready =
      Boolean(message.ready) &&
      this.playerHasValidActiveSelection(client.sessionId);
    this.refreshStatus();
  }

  private handleMode(client: Client, message: ModeMessage): void {
    this.applyRoomSettings(client.sessionId, { mode: message?.mode });
  }

  private handleRoomSettings(client: Client, message: RoomSettingsMessage | null | undefined): void {
    this.applyRoomSettings(client.sessionId, message ?? {});
  }

  private handleClaimSeat(client: Client, message: ClaimSeatMessage): void {
    const context = this.lobbySeatContext(client, message.slotId);
    if (!context || !this.slotCanBeClaimed(context.slot)) {
      return;
    }

    this.releaseSeatsForSession(client.sessionId, context.slotId);
    context.slot.ownerSessionId = client.sessionId;
    context.slot.selectedCharacterId = sanitizeCharacterPick(context.slot.selectedCharacterId, context.slotId);
    context.slot.characterSelected = false;
    context.player.ready = false;
    this.refreshStatus();
  }

  private handleSelectCharacter(client: Client, message: SelectCharacterMessage): void {
    const context = this.lobbySeatContext(client, message.slotId);
    if (!context || !canEditSlot(context.slot.ownerSessionId, client.sessionId)) {
      return;
    }

    context.slot.selectedCharacterId = sanitizeCharacterPick(message.characterId, context.slotId);
    context.slot.characterSelected = true;
    context.player.ready = false;
    this.refreshStatus();
  }

  private handleClaimTestCapsule(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) {
      return;
    }

    const cosmetic = cosmeticPool[Math.floor(Math.random() * cosmeticPool.length)];
    player.tokens += 1;

    if (!player.inventory.includes(cosmetic)) {
      player.inventory.push(cosmetic);
      player.equippedNameplate = cosmetic;
      this.state.lastRewardLog = `${player.displayName} unlocked ${cosmetic}.`;
    } else {
      player.tokens += 2;
      this.state.lastRewardLog = `${player.displayName} found duplicate ${cosmetic} and gained Sparks.`;
    }
  }

  private handleEquipNameplate(client: Client, message: EquipMessage): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || !message.nameplate) {
      return;
    }

    if (player.inventory.includes(message.nameplate)) {
      player.equippedNameplate = message.nameplate;
    }
  }

  private handleStartNextRound(client: Client): void {
    if (this.state.phase !== "round-over" || client.sessionId !== this.state.hostSessionId) {
      return;
    }

    this.state.roundNumber += 1;
    startCombatPreview(this.state);
  }

  private handleStartRematch(client: Client): void {
    if (this.state.phase !== "match-over" || client.sessionId !== this.state.hostSessionId) return;
    resetMatchForRematch(this.state);
    this.refreshStatus();
  }

  private handleTurnIntent(client: Client, message: SubmitTurnIntentMessage): void {
    turnIntentHandlerFor(message?.action)(this.state, client.sessionId, message);
  }

  private tickServerTurnClock(): void {
    if (this.state.phase !== "combat-preview") {
      return;
    }

    advanceTimedOutPreviewTurn(this.state);
  }

  private syncRoles() {
    const players = this.getPlayers();
    const roles = assignLobbyRoles(players);
    this.resetLobbyRoles();

    for (const player of players) {
      const role = roles.get(player.sessionId) ?? "spectator";
      this.syncPlayerRole(player, role);
    }
  }

  private ensureLobbySlots() {
    for (const slotId of LOBBY_SLOT_IDS) {
      if (!this.state.slots.has(slotId)) {
        const slot = new LobbySlotState();
        slot.slotId = slotId;
        slot.team = teamForSlot(slotId);
        slot.selectedCharacterId = defaultCharacterForSlot(slotId);
        this.state.slots.set(slotId, slot);
      }
    }
  }

  private syncLobbySlots() {
    this.ensureLobbySlots();
    const context = this.lobbySlotSyncContext();

    for (const [slotId, slot] of this.state.slots.entries() as Iterable<[VehicleId, LobbySlotState]>) {
      this.syncLobbySlot(slotId, slot, context);
    }
  }

  private refreshStatus() {
    this.syncLobbyState();

    if (this.isGameplayPhase()) {
      return;
    }

    if (this.applyLobbyStatusRules()) {
      return;
    }

    startCombatPreview(this.state);
  }

  private getPlayers() {
    return Array.from(this.state.players.values()) as PlayerState[];
  }

  private getActiveSlots(): LobbySlotState[] {
    const activeSlotIds = new Set(activeSlotIdsForMode(this.state.mode));
    return Array.from(this.state.slots.entries())
      .filter(([slotId]) => activeSlotIds.has(slotId as VehicleId))
      .map(([, slot]) => slot as LobbySlotState);
  }

  private playerOwnsActiveSlot(sessionId: string): boolean {
    return this.getActiveSlots().some((slot) => slot.ownerSessionId === sessionId);
  }

  private playerHasValidActiveSelection(sessionId: string): boolean {
    const slot = this.getActiveSlots().find((activeSlot) => activeSlot.ownerSessionId === sessionId);
    return slot
      ? slot.characterSelected && sanitizeCharacterPick(slot.selectedCharacterId, slot.slotId) === slot.selectedCharacterId
      : false;
  }

  private canChangeLobby(sessionId: string): boolean {
    return (this.state.phase === "lobby" || this.state.phase === "ready") && sessionId === this.state.hostSessionId;
  }

  private applyRoomSettings(sessionId: string, message: RoomSettingsMessage): void {
    if (!this.canChangeLobby(sessionId)) {
      return;
    }

    const current = this.currentRoomSettings();
    const next = mergeRoomSettings(current, message);
    if (roomSettingsEqual(current, next)) {
      return;
    }

    this.state.mode = next.mode;
    this.state.matchLength = next.matchLength;
    this.state.mapPick = next.mapPick;
    this.state.friendlyFire = next.friendlyFire;
    this.resetReadiness();
    this.syncLobbySlots();
    this.refreshStatus();
  }

  private currentRoomSettings(): RoomSettings {
    return {
      mode: this.state.mode,
      matchLength: this.state.matchLength,
      mapPick: this.state.mapPick,
      friendlyFire: this.state.friendlyFire,
    };
  }

  private canChangeReadiness(sessionId: string): boolean {
    return (this.state.phase === "lobby" || this.state.phase === "ready") && this.playerOwnsActiveSlot(sessionId);
  }

  private lobbySeatContext(client: Client, slotId: VehicleId | undefined): LobbySeatContext | undefined {
    if (!this.canChangeLobbySeat(slotId)) {
      return undefined;
    }

    const player = this.state.players.get(client.sessionId);
    const slot = this.activeSlotFor(slotId);
    if (!player || !slot) {
      return undefined;
    }

    return { player, slot, slotId };
  }

  private slotCanBeClaimed(slot: LobbySlotState): boolean {
    return !slot.ownerSessionId;
  }

  private releaseSeatsForSession(sessionId: string, exceptSlotId?: VehicleId): void {
    for (const [slotId, slot] of this.state.slots.entries() as Iterable<[VehicleId, LobbySlotState]>) {
      if (slot.ownerSessionId === sessionId && slotId !== exceptSlotId) {
        slot.ownerSessionId = "";
        slot.characterSelected = false;
        slot.selectedCharacterId = defaultCharacterForSlot(slotId);
      }
    }
  }

  private resetReadiness(): void {
    for (const player of this.getPlayers()) {
      player.ready = false;
    }
  }

  private syncPlayerTeams(): void {
    for (const player of this.getPlayers()) {
      player.team = this.teamForPlayer(player);
    }
  }

  private playerDisplayName(sessionId: string): string {
    return this.state.players.get(sessionId)?.displayName ?? "Guest";
  }

  private modeSeatName(): string {
    return this.state.mode === "1v1" ? "Duel" : "Doubles";
  }

  private resetLobbyRoles(): void {
    this.state.hostSessionId = "";
    this.state.spectatorSessionIds.splice(0, this.state.spectatorSessionIds.length);
  }

  private syncPlayerRole(player: PlayerState, role: PlayerRole): void {
    player.role = role;
    if (role === "host") {
      this.state.hostSessionId = player.sessionId;
      return;
    }

    if (role === "spectator") {
      this.markSpectator(player);
    }
  }

  private markSpectator(player: PlayerState): void {
    player.ready = false;
    this.state.spectatorSessionIds.push(player.sessionId);
  }

  private lobbySlotSyncContext(): LobbySlotSyncContext {
    return {
      activeSlotIds: new Set(activeSlotIdsForMode(this.state.mode)),
      liveSessionIds: new Set(this.getPlayers().map((player) => player.sessionId)),
      seenOwners: new Set<string>(),
    };
  }

  private syncLobbySlot(slotId: VehicleId, slot: LobbySlotState, context: LobbySlotSyncContext): void {
    slot.active = context.activeSlotIds.has(slotId);
    if (this.shouldReleaseSlotOwner(slot, context)) {
      slot.ownerSessionId = "";
      slot.characterSelected = false;
      slot.selectedCharacterId = defaultCharacterForSlot(slotId);
    }
    this.rememberSlotOwner(slot, context.seenOwners);
    slot.selectedCharacterId = sanitizeCharacterPick(slot.selectedCharacterId, slotId);
  }

  private shouldReleaseSlotOwner(slot: LobbySlotState, context: LobbySlotSyncContext): boolean {
    return !slot.active || !context.liveSessionIds.has(slot.ownerSessionId) || context.seenOwners.has(slot.ownerSessionId);
  }

  private rememberSlotOwner(slot: LobbySlotState, seenOwners: Set<string>): void {
    if (slot.ownerSessionId) {
      seenOwners.add(slot.ownerSessionId);
    }
  }

  private syncLobbyState(): void {
    this.ensureLobbySlots();
    this.syncLobbySlots();
    this.syncRoles();
    this.autoSeatUnseatedPlayers();
    this.syncPlayerTeams();
  }

  private autoSeatUnseatedPlayers(): void {
    if (!this.canAutoSeatPlayers()) {
      return;
    }

    for (const player of this.getPlayersByJoinOrder()) {
      if (!this.playerOwnsActiveSlot(player.sessionId)) {
        this.autoSeatPlayer(player);
      }
    }
  }

  private canAutoSeatPlayers(): boolean {
    return this.state.phase === "lobby" || this.state.phase === "ready";
  }

  private getPlayersByJoinOrder(): PlayerState[] {
    return this.getPlayers().sort((left, right) => left.joinOrder - right.joinOrder);
  }

  private autoSeatPlayer(player: PlayerState): void {
    const slot = this.balancedOpenSlot();
    if (!slot) {
      return;
    }

    slot.ownerSessionId = player.sessionId;
    slot.selectedCharacterId = sanitizeCharacterPick(slot.selectedCharacterId, slot.slotId);
    slot.characterSelected = false;
    player.ready = false;
  }

  private balancedOpenSlot(): LobbySlotState | undefined {
    const activeSlots = this.getActiveSlots();
    const openSlots = activeSlots.filter((slot) => !slot.ownerSessionId);
    const teamCounts = activeTeamSeatCounts(activeSlots);

    return openSlots.find((slot) => teamCounts.get(slot.team) === lowestOpenTeamCount(openSlots, teamCounts));
  }

  private isGameplayPhase(): boolean {
    return this.state.phase === "combat-preview" || this.state.phase === "round-over" || this.state.phase === "match-over";
  }

  private applyLobbyStatusRules(): boolean {
    return [
      () => this.applyNoHostStatus(),
      () => this.applyOpenSeatStatus(),
      () => this.applyInvalidSelectionStatus(),
      () => this.applyUnreadyStatus(),
    ].some((applyStatus) => applyStatus());
  }

  private applyNoHostStatus(): boolean {
    if (this.state.players.get(this.state.hostSessionId)) {
      return false;
    }

    this.setLobbyStatus("Waiting for players.", "lobby");
    return true;
  }

  private applyOpenSeatStatus(): boolean {
    if (!this.getActiveSlots().some((slot) => !slot.ownerSessionId)) {
      return false;
    }

    this.setLobbyStatus(`Waiting for players to fill ${this.modeSeatName()} seats.`, "lobby");
    return true;
  }

  private applyUnreadyStatus(): boolean {
    const unreadySlot = this.getActiveSlots().find((slot) => !this.state.players.get(slot.ownerSessionId)?.ready);
    if (!unreadySlot) {
      return false;
    }

    this.setLobbyStatus(`Waiting for ${this.playerDisplayName(unreadySlot.ownerSessionId)} to ready.`, "ready");
    return true;
  }

  private applyInvalidSelectionStatus(): boolean {
    if (isReadyToAutoStart({ mode: this.state.mode, players: this.getPlayers(), slots: this.getActiveSlots() })) {
      return false;
    }

    this.setLobbyStatus("Waiting for players to choose units.", "ready");
    return true;
  }

  private setLobbyStatus(status: string, phase: "lobby" | "ready"): void {
    this.state.phase = phase;
    this.state.status = status;
    clearCombatPreview(this.state);
  }

  private canChangeLobbySeat(slotId: VehicleId | undefined): slotId is VehicleId {
    return Boolean(slotId) && (this.state.phase === "lobby" || this.state.phase === "ready");
  }

  private activeSlotFor(slotId: VehicleId): LobbySlotState | undefined {
    const slot = this.state.slots.get(slotId);
    return slot?.active ? slot : undefined;
  }

  private teamForPlayer(player: PlayerState): TeamId {
    const ownedSlot = this.getActiveSlots().find((slot) => slot.ownerSessionId === player.sessionId);
    return ownedSlot?.team ?? this.defaultTeamForRole(player.role);
  }

  private defaultTeamForRole(role: PlayerRole): TeamId {
    return role === "host" ? "red" : "blue";
  }
}

function roomSettingsEqual(left: RoomSettings, right: RoomSettings): boolean {
  return (
    left.mode === right.mode &&
    left.matchLength === right.matchLength &&
    left.mapPick === right.mapPick &&
    left.friendlyFire === right.friendlyFire
  );
}

function turnIntentHandlerFor(action: unknown): TurnIntentHandler {
  return typeof action === "string" ? TURN_INTENT_HANDLERS[action] ?? DEFAULT_TURN_INTENT_HANDLER : DEFAULT_TURN_INTENT_HANDLER;
}

function activeTeamSeatCounts(slots: readonly LobbySlotState[]): Map<TeamId, number> {
  const teamCounts = new Map<TeamId, number>([
    ["red", 0],
    ["blue", 0],
  ]);

  for (const slot of slots) {
    if (slot.ownerSessionId) {
      teamCounts.set(slot.team, (teamCounts.get(slot.team) ?? 0) + 1);
    }
  }

  return teamCounts;
}

function lowestOpenTeamCount(openSlots: readonly LobbySlotState[], teamCounts: ReadonlyMap<TeamId, number>): number {
  return Math.min(...openSlots.map((slot) => teamCounts.get(slot.team) ?? 0));
}
