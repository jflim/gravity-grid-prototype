import { ArraySchema, defineTypes, MapSchema, Schema } from "@colyseus/schema";

export type RoomPhase = "lobby" | "ready" | "combat-preview" | "round-over";
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

export class CombatVehicleState extends Schema {
  declare vehicleId: string;
  declare ownerSessionId: string;
  declare displayName: string;
  declare team: TeamId;
  declare className: string;
  declare hp: number;
  declare maxHp: number;
  declare alive: boolean;
  declare x: number;
  declare y: number;
  declare angle: number;

  constructor() {
    super();
    this.vehicleId = "";
    this.ownerSessionId = "";
    this.displayName = "Guest";
    this.team = "red";
    this.className = "Bunger Rig";
    this.hp = 100;
    this.maxHp = 100;
    this.alive = true;
    this.x = 0;
    this.y = 0;
    this.angle = 45;
  }
}

export class GravityCanyonState extends Schema {
  declare workingTitle: string;
  declare roomCode: string;
  declare phase: RoomPhase;
  declare status: string;
  declare maxPlayers: number;
  declare roundNumber: number;
  declare turnNumber: number;
  declare wind: number;
  declare activeVehicleId: string;
  declare winnerTeam: string;
  declare lastRewardLog: string;
  declare players: MapSchema<PlayerState>;
  declare vehicles: ArraySchema<CombatVehicleState>;

  constructor() {
    super();
    this.workingTitle = "Gravity Canyon";
    this.roomCode = "";
    this.phase = "lobby";
    this.status = "Waiting for players.";
    this.maxPlayers = 2;
    this.roundNumber = 1;
    this.turnNumber = 0;
    this.wind = 0;
    this.activeVehicleId = "";
    this.winnerTeam = "";
    this.lastRewardLog = "";
    this.players = new MapSchema<PlayerState>();
    this.vehicles = new ArraySchema<CombatVehicleState>();
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

defineTypes(CombatVehicleState, {
  vehicleId: "string",
  ownerSessionId: "string",
  displayName: "string",
  team: "string",
  className: "string",
  hp: "number",
  maxHp: "number",
  alive: "boolean",
  x: "number",
  y: "number",
  angle: "number",
});

defineTypes(GravityCanyonState, {
  workingTitle: "string",
  roomCode: "string",
  phase: "string",
  status: "string",
  maxPlayers: "number",
  roundNumber: "number",
  turnNumber: "number",
  wind: "number",
  activeVehicleId: "string",
  winnerTeam: "string",
  lastRewardLog: "string",
  players: { map: PlayerState },
  vehicles: { array: CombatVehicleState },
});
