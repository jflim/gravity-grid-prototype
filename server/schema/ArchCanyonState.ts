import { ArraySchema, defineTypes, MapSchema, Schema } from "@colyseus/schema";

export type RoomPhase = "lobby" | "ready" | "combat-preview";
export type TeamId = "red" | "blue";

export class PlayerState extends Schema {
  declare sessionId: string;
  declare displayName: string;
  declare team: TeamId;
  declare ready: boolean;
  declare tokens: number;
  declare equippedNameplate: string;
  declare inventory: ArraySchema<string>;

  constructor() {
    super();
    this.sessionId = "";
    this.displayName = "Guest";
    this.team = "red";
    this.ready = false;
    this.tokens = 0;
    this.equippedNameplate = "Canyon Rookie";
    this.inventory = new ArraySchema<string>();
  }
}

export class ArchCanyonState extends Schema {
  declare workingTitle: string;
  declare roomCode: string;
  declare phase: RoomPhase;
  declare status: string;
  declare maxPlayers: number;
  declare roundNumber: number;
  declare lastRewardLog: string;
  declare players: MapSchema<PlayerState>;

  constructor() {
    super();
    this.workingTitle = "Arch Canyon";
    this.roomCode = "";
    this.phase = "lobby";
    this.status = "Waiting for players.";
    this.maxPlayers = 2;
    this.roundNumber = 1;
    this.lastRewardLog = "";
    this.players = new MapSchema<PlayerState>();
  }
}

defineTypes(PlayerState, {
  sessionId: "string",
  displayName: "string",
  team: "string",
  ready: "boolean",
  tokens: "number",
  equippedNameplate: "string",
  inventory: { array: "string" },
});

defineTypes(ArchCanyonState, {
  workingTitle: "string",
  roomCode: "string",
  phase: "string",
  status: "string",
  maxPlayers: "number",
  roundNumber: "number",
  lastRewardLog: "string",
  players: { map: PlayerState },
});
