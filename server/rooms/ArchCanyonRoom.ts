import { ArraySchema } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import { ArchCanyonState, PlayerState } from "../schema/ArchCanyonState.js";

type JoinOptions = {
  displayName?: string;
};

type ReadyMessage = {
  ready?: boolean;
};

type EquipMessage = {
  nameplate?: string;
};

const cosmeticPool = [
  "Canyon Rookie",
  "Archshot Ace",
  "Spark Drifter",
  "Mesa Idol",
  "Cloudline Champ",
];

export class ArchCanyonRoom extends Room<{ state: ArchCanyonState }> {
  maxClients = 2;

  onCreate() {
    this.setState(new ArchCanyonState());
    this.state.roomCode = this.roomId;

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

      player.ready = Boolean(message.ready);
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

    this.refreshStatus();
  }

  onJoin(client: Client, options: JoinOptions) {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.displayName = sanitizeDisplayName(options.displayName);
    player.team = this.nextTeam();
    player.inventory = new ArraySchema<string>("Canyon Rookie");
    player.equippedNameplate = "Canyon Rookie";

    this.state.players.set(client.sessionId, player);
    this.refreshStatus();
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
    this.refreshStatus();
  }

  private nextTeam() {
    const teams = this.getPlayers().map((player) => player.team);
    return teams.includes("red") ? "blue" : "red";
  }

  private refreshStatus() {
    const players = this.getPlayers();
    const readyPlayers = players.filter((player) => player.ready);

    if (players.length < this.maxClients) {
      this.state.phase = "lobby";
      this.state.status = `Waiting for ${this.maxClients - players.length} player.`;
      return;
    }

    if (readyPlayers.length < players.length) {
      this.state.phase = "ready";
      this.state.status = "Room filled. Waiting for ready checks.";
      return;
    }

    this.state.phase = "combat-preview";
    this.state.status = "Both players ready. Combat sync comes next.";
  }

  private getPlayers() {
    return Array.from(this.state.players.values()) as PlayerState[];
  }
}

function sanitizeDisplayName(displayName = "Guest") {
  const clean = displayName.replace(/[^\w .-]/g, "").replace(/\s+/g, " ").trim();
  return clean.slice(0, 18) || "Guest";
}
