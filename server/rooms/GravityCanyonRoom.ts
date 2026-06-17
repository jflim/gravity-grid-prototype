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
} from "../schema/GravityCanyonState.js";
import { sanitizeDisplayName, type GameMode } from "../v1/rules.js";
import {
  clearCombatPreview,
  previewFireForClient,
  startCombatPreview,
  teamForSlot,
} from "./combatPreview.js";

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

const cosmeticPool = [
  "Canyon Rookie",
  "Archshot Ace",
  "Spark Drifter",
  "Mesa Idol",
  "Cloudline Champ",
];
const LOBBY_SLOT_IDS: readonly VehicleId[] = ["red-1", "blue-1", "red-2", "blue-2"];

export class GravityCanyonRoom extends Room<{ state: GravityCanyonState }> {
  maxClients = 8;
  private nextJoinOrder = 1;

  onCreate() {
    this.setState(new GravityCanyonState());
    this.state.roomCode = "auto-room";
    this.ensureLobbySlots();

    this.onMessage("setDisplayName", (client, displayName: string) =>
      this.handleDisplayName(client, displayName),
    );
    this.onMessage("setReady", (client, message: ReadyMessage) => this.handleReady(client, message));
    this.onMessage("setMode", (client, message: ModeMessage) => this.handleMode(client, message));
    this.onMessage("claimSeat", (client, message: ClaimSeatMessage) => this.handleClaimSeat(client, message));
    this.onMessage("selectCharacter", (client, message: SelectCharacterMessage) =>
      this.handleSelectCharacter(client, message),
    );
    this.onMessage("claimTestCapsule", (client) => this.handleClaimTestCapsule(client));
    this.onMessage("equipNameplate", (client, message: EquipMessage) => this.handleEquipNameplate(client, message));
    this.onMessage("previewFire", (client) => previewFireForClient(this.state, client.sessionId));
    this.onMessage("startNextRound", (client) => this.handleStartNextRound(client));

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

    if (this.state.phase === "combat-preview" || this.state.phase === "round-over") {
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
    if (!player) {
      return;
    }

    player.ready =
      Boolean(message.ready) &&
      this.playerOwnsActiveSlot(client.sessionId) &&
      this.playerHasValidActiveSelection(client.sessionId);
    this.refreshStatus();
  }

  private handleMode(client: Client, message: ModeMessage): void {
    if (!this.canChangeLobby(client.sessionId) || (message.mode !== "1v1" && message.mode !== "2v2")) {
      return;
    }

    this.state.mode = message.mode;
    this.resetReadiness();
    this.syncLobbySlots();
    this.refreshStatus();
  }

  private handleClaimSeat(client: Client, message: ClaimSeatMessage): void {
    const context = this.lobbySeatContext(client, message.slotId);
    if (!context || this.slotIsOwnedByAnotherPlayer(context.slot, client.sessionId)) {
      return;
    }

    this.releaseSeatsForSession(client.sessionId, context.slotId);
    context.slot.ownerSessionId = client.sessionId;
    context.slot.selectedCharacterId = sanitizeCharacterPick(context.slot.selectedCharacterId, context.slotId);
    context.player.ready = false;
    this.refreshStatus();
  }

  private handleSelectCharacter(client: Client, message: SelectCharacterMessage): void {
    const context = this.lobbySeatContext(client, message.slotId);
    if (!context || !canEditSlot(context.slot.ownerSessionId, client.sessionId)) {
      return;
    }

    context.slot.selectedCharacterId = sanitizeCharacterPick(message.characterId, context.slotId);
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

  private syncRoles() {
    const players = this.getPlayers();
    const roles = assignLobbyRoles(players);
    this.state.hostSessionId = "";
    this.state.spectatorSessionIds.splice(0, this.state.spectatorSessionIds.length);

    for (const player of players) {
      const role = roles.get(player.sessionId) ?? "spectator";
      player.role = role;

      if (role === "host") {
        this.state.hostSessionId = player.sessionId;
      } else {
        if (role === "spectator") {
          player.ready = false;
          this.state.spectatorSessionIds.push(player.sessionId);
        }
      }
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
    const activeSlotIds = new Set(activeSlotIdsForMode(this.state.mode));
    const liveSessionIds = new Set(this.getPlayers().map((player) => player.sessionId));
    const seenOwners = new Set<string>();

    for (const [slotId, slot] of this.state.slots.entries() as Iterable<[VehicleId, LobbySlotState]>) {
      slot.active = activeSlotIds.has(slotId);
      if (
        !slot.active ||
        !liveSessionIds.has(slot.ownerSessionId) ||
        seenOwners.has(slot.ownerSessionId)
      ) {
        slot.ownerSessionId = "";
      }
      if (slot.ownerSessionId) {
        seenOwners.add(slot.ownerSessionId);
      }
      slot.selectedCharacterId = sanitizeCharacterPick(slot.selectedCharacterId, slotId);
    }
  }

  private refreshStatus() {
    this.ensureLobbySlots();
    this.syncLobbySlots();
    this.syncRoles();
    this.syncPlayerTeams();

    if (this.state.phase === "combat-preview" || this.state.phase === "round-over") {
      return;
    }

    const host = this.state.players.get(this.state.hostSessionId);
    if (!host) {
      this.state.phase = "lobby";
      this.state.status = "Waiting for players.";
      clearCombatPreview(this.state);
      return;
    }

    const activeSlots = this.getActiveSlots();
    const openSeat = activeSlots.find((slot) => !slot.ownerSessionId);
    if (openSeat) {
      this.state.phase = "lobby";
      this.state.status = `Waiting for players to claim ${this.modeSeatName()} seats.`;
      clearCombatPreview(this.state);
      return;
    }

    const unreadySlot = activeSlots.find((slot) => !this.state.players.get(slot.ownerSessionId)?.ready);
    if (unreadySlot) {
      this.state.phase = "ready";
      this.state.status = `Waiting for ${this.playerDisplayName(unreadySlot.ownerSessionId)} to ready.`;
      clearCombatPreview(this.state);
      return;
    }

    if (!isReadyToAutoStart({ mode: this.state.mode, players: this.getPlayers(), slots: activeSlots })) {
      this.state.phase = "ready";
      this.state.status = "Waiting for valid character picks.";
      clearCombatPreview(this.state);
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
    return slot ? sanitizeCharacterPick(slot.selectedCharacterId, slot.slotId) === slot.selectedCharacterId : false;
  }

  private canChangeLobby(sessionId: string): boolean {
    return (this.state.phase === "lobby" || this.state.phase === "ready") && sessionId === this.state.hostSessionId;
  }

  private lobbySeatContext(client: Client, slotId: VehicleId | undefined): LobbySeatContext | undefined {
    if ((this.state.phase !== "lobby" && this.state.phase !== "ready") || !slotId) {
      return undefined;
    }

    const player = this.state.players.get(client.sessionId);
    const slot = this.state.slots.get(slotId);
    return player && slot?.active ? { player, slot, slotId } : undefined;
  }

  private slotIsOwnedByAnotherPlayer(slot: LobbySlotState, sessionId: string): boolean {
    return Boolean(slot.ownerSessionId && slot.ownerSessionId !== sessionId);
  }

  private releaseSeatsForSession(sessionId: string, exceptSlotId?: VehicleId): void {
    for (const [slotId, slot] of this.state.slots.entries() as Iterable<[VehicleId, LobbySlotState]>) {
      if (slot.ownerSessionId === sessionId && slotId !== exceptSlotId) {
        slot.ownerSessionId = "";
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
      const ownedSlot = this.getActiveSlots().find((slot) => slot.ownerSessionId === player.sessionId);
      player.team = ownedSlot?.team ?? (player.role === "host" ? "red" : "blue");
    }
  }

  private playerDisplayName(sessionId: string): string {
    return this.state.players.get(sessionId)?.displayName ?? "Guest";
  }

  private modeSeatName(): string {
    return this.state.mode === "1v1" ? "Duel" : "Doubles";
  }
}
