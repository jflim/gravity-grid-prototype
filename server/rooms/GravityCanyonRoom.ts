import { ArraySchema } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import type { CharacterId, VehicleId } from "../../shared/model/gameTypes.js";
import {
  activeSlotIdsForMode,
  assignCaptainRoles,
  canEditSlot,
  defaultCharacterForSlot,
  isReadyToAutoStart,
  ownerSessionIdForSlot,
  sanitizeCharacterPick,
  type CaptainRole,
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
      previewFireForClient(this.state, client.sessionId);
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
      startCombatPreview(this.state);
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

    clearCombatPreview(this.state);
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
      clearCombatPreview(this.state);
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
      clearCombatPreview(this.state);
      return;
    }

    if (this.state.phase !== "combat-preview" && this.state.phase !== "round-over") {
      startCombatPreview(this.state);
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
}
