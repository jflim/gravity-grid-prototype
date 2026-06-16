import { ArraySchema } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import { unitDefinitionForCharacter } from "../../shared/content/v1Units.js";
import type { CharacterId, TeamId, VehicleId } from "../../shared/model/gameTypes.js";
import {
  activeSlotIdsForMode,
  assignCaptainRoles,
  buildPreviewSlots,
  canEditSlot,
  defaultCharacterForSlot,
  isReadyToAutoStart,
  ownerSessionIdForSlot,
  sanitizeCharacterPick,
  type CaptainRole,
} from "./autoRoomLobby.js";
import {
  CombatVehicleState,
  GravityCanyonState,
  LobbySlotState,
  PlayerState,
} from "../schema/GravityCanyonState.js";
import { sanitizeDisplayName, type GameMode } from "../v1/rules.js";

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

const cosmeticPool = [
  "Canyon Rookie",
  "Archshot Ace",
  "Spark Drifter",
  "Mesa Idol",
  "Cloudline Champ",
];
const PREVIEW_DAMAGE = 40;
const VEHICLE_MAX_HP = 100;
const LOBBY_SLOT_IDS: readonly VehicleId[] = ["red-1", "blue-1", "red-2", "blue-2"];

export class GravityCanyonRoom extends Room<{ state: GravityCanyonState }> {
  maxClients = 8;
  private nextJoinOrder = 1;

  onCreate() {
    this.setState(new GravityCanyonState());
    this.state.roomCode = "auto-room";
    this.ensureLobbySlots();

    this.onMessage("setDisplayName", (client, displayName: string) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return;
      }

      player.displayName = sanitizeDisplayName(displayName);
      this.refreshStatus();
    });

    this.onMessage("setReady", (client, message: ReadyMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return;
      }

      player.ready = player.role === "red-captain" || player.role === "blue-captain" ? Boolean(message.ready) : false;
      this.refreshStatus();
    });

    this.onMessage("setMode", (client, message: ModeMessage) => {
      if (this.state.phase !== "lobby" && this.state.phase !== "ready") {
        return;
      }

      if (client.sessionId !== this.state.redCaptainSessionId) {
        return;
      }

      if (message.mode !== "1v1" && message.mode !== "2v2") {
        return;
      }

      this.state.mode = message.mode;
      this.syncLobbySlots();
      this.refreshStatus();
    });

    this.onMessage("selectCharacter", (client, message: SelectCharacterMessage) => {
      if ((this.state.phase !== "lobby" && this.state.phase !== "ready") || !message.slotId) {
        return;
      }

      const player = this.state.players.get(client.sessionId);
      if (!player || !canEditSlot(player.role as CaptainRole, message.slotId)) {
        return;
      }

      const slot = this.state.slots.get(message.slotId);
      if (!slot || !slot.active) {
        return;
      }

      slot.selectedCharacterId = sanitizeCharacterPick(message.characterId, message.slotId);
      this.refreshStatus();
    });

    this.onMessage("claimTestCapsule", (client) => {
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
    });

    this.onMessage("equipNameplate", (client, message: EquipMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !message.nameplate) {
        return;
      }

      if (player.inventory.includes(message.nameplate)) {
        player.equippedNameplate = message.nameplate;
      }
    });

    this.onMessage("previewFire", (client) => {
      this.previewFire(client);
    });

    this.onMessage("startNextRound", () => {
      if (
        this.state.phase !== "round-over" ||
        !this.state.redCaptainSessionId ||
        !this.state.blueCaptainSessionId
      ) {
        return;
      }

      this.state.roundNumber += 1;
      this.startCombatPreview();
    });

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

    if (this.state.phase === "combat-preview" || this.state.phase === "round-over") {
      this.state.phase = "lobby";
    }

    this.clearCombatPreview();
    this.refreshStatus();
  }

  private syncRoles() {
    const players = this.getPlayers();
    const roles = assignCaptainRoles(players);
    this.state.redCaptainSessionId = "";
    this.state.blueCaptainSessionId = "";
    this.state.spectatorSessionIds.splice(0, this.state.spectatorSessionIds.length);

    for (const player of players) {
      const role = roles.get(player.sessionId) ?? "spectator";
      player.role = role;
      player.team = role === "blue-captain" ? "blue" : "red";

      if (role === "red-captain") {
        this.state.redCaptainSessionId = player.sessionId;
      } else if (role === "blue-captain") {
        this.state.blueCaptainSessionId = player.sessionId;
      } else {
        player.ready = false;
        this.state.spectatorSessionIds.push(player.sessionId);
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

    for (const [slotId, slot] of this.state.slots.entries() as Iterable<[VehicleId, LobbySlotState]>) {
      slot.active = activeSlotIds.has(slotId);
      slot.ownerSessionId = slot.active
        ? ownerSessionIdForSlot(slotId, this.state.redCaptainSessionId, this.state.blueCaptainSessionId)
        : "";
      slot.selectedCharacterId = sanitizeCharacterPick(slot.selectedCharacterId, slotId);
    }
  }

  private refreshStatus() {
    this.syncRoles();
    this.syncLobbySlots();

    const red = this.state.players.get(this.state.redCaptainSessionId);
    const blue = this.state.players.get(this.state.blueCaptainSessionId);
    const redReady = red?.ready ?? false;
    const blueReady = blue?.ready ?? false;
    const selectedCharacters = this.getSelectedCharacters();

    if (!red || !blue) {
      this.state.phase = "lobby";
      this.state.status = red ? "Waiting for blue captain." : "Waiting for red captain.";
      this.clearCombatPreview();
      return;
    }

    if (
      !isReadyToAutoStart({
        mode: this.state.mode,
        redCaptainSessionId: this.state.redCaptainSessionId,
        blueCaptainSessionId: this.state.blueCaptainSessionId,
        redReady,
        blueReady,
        selectedCharacters,
      })
    ) {
      this.state.phase = "ready";
      this.state.status = !redReady ? "Waiting for red ready." : "Waiting for blue ready.";
      this.clearCombatPreview();
      return;
    }

    if (this.state.phase !== "combat-preview" && this.state.phase !== "round-over") {
      this.startCombatPreview();
    }
  }

  private getPlayers() {
    return Array.from(this.state.players.values()) as PlayerState[];
  }

  private getSelectedCharacters(): Partial<Record<VehicleId, string>> {
    return Object.fromEntries(
      Array.from(this.state.slots.entries()).map(([slotId, slot]) => [slotId, slot.selectedCharacterId]),
    ) as Partial<Record<VehicleId, string>>;
  }

  private startCombatPreview() {
    this.state.phase = "combat-preview";
    this.state.winnerTeam = "";
    this.state.turnNumber = 1;
    this.state.wind = rollWind();
    this.state.vehicles.splice(0, this.state.vehicles.length);

    const previewSlots = buildPreviewSlots({
      mode: this.state.mode,
      redCaptainSessionId: this.state.redCaptainSessionId,
      blueCaptainSessionId: this.state.blueCaptainSessionId,
      selectedCharacters: this.getSelectedCharacters(),
    });

    for (const slot of previewSlots) {
      const owner = this.state.players.get(slot.ownerSessionId);
      if (owner) {
        this.state.vehicles.push(createPreviewVehicle(slot.slotId, slot.selectedCharacterId, owner));
      }
    }

    const activeVehicle = this.state.vehicles[0];
    this.state.activeVehicleId = activeVehicle?.vehicleId ?? "";
    this.state.status = activeVehicle
      ? `Round ${this.state.roundNumber} started. ${activeVehicle.displayName} has the first shot.`
      : "Round started.";
  }

  private clearCombatPreview() {
    this.state.turnNumber = 0;
    this.state.wind = 0;
    this.state.activeVehicleId = "";
    this.state.winnerTeam = "";
    this.state.vehicles.splice(0, this.state.vehicles.length);
  }

  private previewFire(client: Client) {
    if (this.state.phase !== "combat-preview") {
      return;
    }

    const activeVehicle = this.state.vehicles.find((vehicle) => vehicle.vehicleId === this.state.activeVehicleId);
    if (!activeVehicle || activeVehicle.ownerSessionId !== client.sessionId || !activeVehicle.alive) {
      return;
    }

    const target = this.state.vehicles.find((vehicle) => vehicle.team !== activeVehicle.team && vehicle.alive);
    if (!target) {
      this.finishRound(activeVehicle.team);
      return;
    }

    target.hp = Math.max(0, target.hp - PREVIEW_DAMAGE);
    target.alive = target.hp > 0;

    if (!this.hasAliveTeam(target.team)) {
      this.finishRound(activeVehicle.team);
      return;
    }

    const nextVehicle = this.nextAliveVehicle(activeVehicle.vehicleId);
    this.state.turnNumber += 1;
    this.state.wind = rollWind();
    this.state.activeVehicleId = nextVehicle?.vehicleId ?? "";
    this.state.status = nextVehicle
      ? `${activeVehicle.displayName}'s server test shot hit ${target.displayName}. ${nextVehicle.displayName} is up.`
      : `${activeVehicle.displayName}'s server test shot resolved.`;
  }

  private nextAliveVehicle(currentVehicleId: string) {
    const vehicles = Array.from(this.state.vehicles);
    const currentIndex = vehicles.findIndex((vehicle) => vehicle.vehicleId === currentVehicleId);

    for (let offset = 1; offset <= vehicles.length; offset += 1) {
      const candidate = vehicles[(currentIndex + offset + vehicles.length) % vehicles.length];
      if (candidate?.alive) {
        return candidate;
      }
    }

    return undefined;
  }

  private hasAliveTeam(team: TeamId) {
    return this.state.vehicles.some((vehicle) => vehicle.team === team && vehicle.alive);
  }

  private finishRound(winnerTeam: TeamId) {
    this.state.phase = "round-over";
    this.state.winnerTeam = winnerTeam;
    this.state.activeVehicleId = "";

    const rewardedSessionIds = new Set<string>();
    const winners = this.state.vehicles.filter((vehicle) => vehicle.team === winnerTeam);
    for (const vehicle of winners) {
      const player = this.state.players.get(vehicle.ownerSessionId);
      if (player && !rewardedSessionIds.has(player.sessionId)) {
        player.tokens += 1;
        rewardedSessionIds.add(player.sessionId);
      }
    }

    this.state.status = `${capitalize(winnerTeam)} team wins round ${this.state.roundNumber}.`;
    this.state.lastRewardLog = `${capitalize(winnerTeam)} team earned 1 preview token.`;
  }
}

function createPreviewVehicle(slotId: VehicleId, characterId: CharacterId, player: PlayerState) {
  const unit = unitDefinitionForCharacter(characterId);
  const team = teamForSlot(slotId);
  const vehicle = new CombatVehicleState();
  vehicle.vehicleId = slotId;
  vehicle.ownerSessionId = player.sessionId;
  vehicle.displayName = `${player.displayName} / ${unit.username}`;
  vehicle.team = team;
  vehicle.className = unit.className;
  vehicle.hp = VEHICLE_MAX_HP;
  vehicle.maxHp = VEHICLE_MAX_HP;
  vehicle.alive = true;
  vehicle.x = team === "red" ? (slotId === "red-1" ? 385 : 710) : slotId === "blue-1" ? 1995 : 1690;
  vehicle.y = 0;
  vehicle.angle = team === "red" ? 47 : 133;
  return vehicle;
}

function teamForSlot(slotId: VehicleId): TeamId {
  return slotId.startsWith("red-") ? "red" : "blue";
}

function rollWind() {
  return Math.floor(Math.random() * 25) - 12;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
