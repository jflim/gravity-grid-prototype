import { ArraySchema } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import { CombatVehicleState, GravityCanyonState, PlayerState, TeamId } from "../schema/GravityCanyonState.js";

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
const PREVIEW_DAMAGE = 40;
const VEHICLE_MAX_HP = 100;

export class GravityCanyonRoom extends Room<{ state: GravityCanyonState }> {
  maxClients = 2;

  onCreate() {
    this.setState(new GravityCanyonState());
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

    this.onMessage("previewFire", (client) => {
      this.previewFire(client);
    });

    this.onMessage("startNextRound", () => {
      if (this.state.phase !== "round-over" || this.getPlayers().length < this.maxClients) {
        return;
      }

      this.state.roundNumber += 1;
      this.startCombatPreview();
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
    this.clearCombatPreview();
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
      this.clearCombatPreview();
      return;
    }

    if (readyPlayers.length < players.length) {
      this.state.phase = "ready";
      this.state.status = "Room filled. Waiting for ready checks.";
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

  private startCombatPreview() {
    const players = this.getPlayers().sort((a, b) => teamSort(a.team) - teamSort(b.team));
    this.state.phase = "combat-preview";
    this.state.winnerTeam = "";
    this.state.turnNumber = 1;
    this.state.wind = rollWind();
    this.state.vehicles.splice(0, this.state.vehicles.length);

    for (const player of players) {
      this.state.vehicles.push(createPreviewVehicle(player));
    }

    const activeVehicle = this.state.vehicles.find((vehicle) => vehicle.team === "red") ?? this.state.vehicles[0];
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

    const nextVehicle = this.nextAliveVehicle(activeVehicle.team);
    this.state.turnNumber += 1;
    this.state.wind = rollWind();
    this.state.activeVehicleId = nextVehicle?.vehicleId ?? "";
    this.state.status = nextVehicle
      ? `${activeVehicle.displayName}'s server test shot hit ${target.displayName}. ${nextVehicle.displayName} is up.`
      : `${activeVehicle.displayName}'s server test shot resolved.`;
  }

  private nextAliveVehicle(previousTeam: TeamId) {
    return this.state.vehicles.find((vehicle) => vehicle.team !== previousTeam && vehicle.alive);
  }

  private hasAliveTeam(team: TeamId) {
    return this.state.vehicles.some((vehicle) => vehicle.team === team && vehicle.alive);
  }

  private finishRound(winnerTeam: TeamId) {
    this.state.phase = "round-over";
    this.state.winnerTeam = winnerTeam;
    this.state.activeVehicleId = "";

    const winners = this.state.vehicles.filter((vehicle) => vehicle.team === winnerTeam);
    for (const vehicle of winners) {
      const player = this.state.players.get(vehicle.ownerSessionId);
      if (player) {
        player.tokens += 1;
      }
    }

    this.state.status = `${capitalize(winnerTeam)} team wins round ${this.state.roundNumber}.`;
    this.state.lastRewardLog = `${capitalize(winnerTeam)} team earned 1 preview token.`;
  }
}

function sanitizeDisplayName(displayName = "Guest") {
  const clean = displayName.replace(/[^\w .-]/g, "").replace(/\s+/g, " ").trim();
  return clean.slice(0, 18) || "Guest";
}

function createPreviewVehicle(player: PlayerState) {
  const vehicle = new CombatVehicleState();
  vehicle.vehicleId = `${player.team}-${player.sessionId.slice(0, 6)}`;
  vehicle.ownerSessionId = player.sessionId;
  vehicle.displayName = player.displayName;
  vehicle.team = player.team;
  vehicle.className = player.team === "red" ? "Bunger Rig" : "Glitch Rover";
  vehicle.hp = VEHICLE_MAX_HP;
  vehicle.maxHp = VEHICLE_MAX_HP;
  vehicle.alive = true;
  vehicle.x = player.team === "red" ? 385 : 1995;
  vehicle.y = 0;
  vehicle.angle = player.team === "red" ? 47 : 133;
  return vehicle;
}

function rollWind() {
  return Math.floor(Math.random() * 25) - 12;
}

function teamSort(team: TeamId) {
  return team === "red" ? 0 : 1;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
