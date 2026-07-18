import { ArraySchema, defineTypes, MapSchema, Schema } from "@colyseus/schema";
import type { CharacterId, VehicleId } from "../../shared/model/gameTypes.js";
import {
  DEFAULT_ROOM_SETTINGS,
  type GameMode,
  type MapPick,
  type MatchLength,
} from "../v1/rules.js";
import { TURN_SECONDS } from "../../shared/v1/tuning.js";
import { MAX_MOVE_UNITS } from "../../shared/v1/tuning.js";

export type RoomPhase = "lobby" | "ready" | "combat-preview" | "round-over" | "match-over";
export type TeamId = "red" | "blue";
export type PlayerRole = "host" | "player" | "spectator";

export class PlayerState extends Schema {
  declare sessionId: string;
  declare displayName: string;
  declare team: TeamId;
  declare role: PlayerRole;
  declare joinOrder: number;
  declare ready: boolean;
  declare tokens: number;
  declare equippedNameplate: string;
  declare inventory: ArraySchema<string>;

  constructor() {
    super();
    this.sessionId = "";
    this.displayName = "Guest";
    this.team = "red";
    this.role = "spectator";
    this.joinOrder = 0;
    this.ready = false;
    this.tokens = 0;
    this.equippedNameplate = "Canyon Rookie";
    this.inventory = new ArraySchema<string>();
  }
}

export class LobbySlotState extends Schema {
  declare slotId: VehicleId;
  declare team: TeamId;
  declare ownerSessionId: string;
  declare selectedCharacterId: CharacterId;
  declare characterSelected: boolean;
  declare active: boolean;

  constructor() {
    super();
    this.slotId = "red-1";
    this.team = "red";
    this.ownerSessionId = "";
    this.selectedCharacterId = "nova";
    this.characterSelected = false;
    this.active = false;
  }
}

export class CombatVehicleState extends Schema {
  declare vehicleId: string;
  declare seatId: string;
  declare ownerSessionId: string;
  declare displayName: string;
  declare team: TeamId;
  declare characterId: CharacterId;
  declare className: string;
  declare hp: number;
  declare maxHp: number;
  declare alive: boolean;
  declare defeatReason: string;
  declare x: number;
  declare y: number;
  declare moveUnits: number;
  declare facing: number;
  declare angle: number;

  constructor() {
    super();
    this.vehicleId = "";
    this.seatId = "";
    this.ownerSessionId = "";
    this.displayName = "Guest";
    this.team = "red";
    this.characterId = "nova";
    this.className = "Bunger Rig";
    this.hp = 100;
    this.maxHp = 100;
    this.alive = true;
    this.defeatReason = "";
    this.x = 0;
    this.y = 0;
    this.moveUnits = MAX_MOVE_UNITS;
    this.facing = 1;
    this.angle = 45;
  }
}

export class TerrainCraterState extends Schema {
  declare x: number;
  declare y: number;
  declare radius: number;
  declare depthFactor: number;

  constructor() {
    super();
    this.x = 0;
    this.y = 0;
    this.radius = 0;
    this.depthFactor = 0;
  }
}

export class GravityCanyonState extends Schema {
  declare workingTitle: string;
  declare roomCode: string;
  declare phase: RoomPhase;
  declare status: string;
  declare maxPlayers: number;
  declare mode: GameMode;
  declare matchLength: MatchLength;
  declare mapPick: MapPick;
  declare friendlyFire: boolean;
  declare selectedMapId: string;
  declare selectedMapName: string;
  declare mapSeed: number;
  declare targetScore: number;
  declare redRoundWins: number;
  declare blueRoundWins: number;
  declare matchWinnerTeam: string;
  declare matchEndReason: string;
  declare terrainRevision: number;
  declare terrainCraters: ArraySchema<TerrainCraterState>;
  declare turnSequence: ArraySchema<string>;
  declare turnDurationSeconds: number;
  declare turnStartedAtMs: number;
  declare turnEndsAtMs: number;
  declare turnSecondsRemaining: number;
  declare serverTimeMs: number;
  declare turnAuthorityVersion: number;
  declare lastAcceptedTurnIntentId: string;
  declare lastAcceptedTurnIntentType: string;
  declare lastAcceptedTurnIntentVehicleId: string;
  declare lastAcceptedTurnIntentSessionId: string;
  declare lastAcceptedTurnInputSeq: number;
  declare lastShotId: string;
  declare lastShotShooterVehicleId: string;
  declare lastShotShooterSessionId: string;
  declare lastShotOriginX: number;
  declare lastShotOriginY: number;
  declare lastShotAngle: number;
  declare lastShotPower: number;
  declare lastShotFacing: number;
  declare lastShotWind: number;
  declare lastShotImpactX: number;
  declare lastShotImpactY: number;
  declare lastShotDirectHitVehicleId: string;
  declare lastShotTargetVehicleId: string;
  declare lastShotDamage: number;
  declare lastShotTargetHpBefore: number;
  declare lastShotTargetHpAfter: number;
  declare lastShotTurnNumber: number;
  declare lastShotTurnAuthorityVersion: number;
  declare lastShotServerTimeMs: number;
  declare hostSessionId: string;
  declare spectatorSessionIds: ArraySchema<string>;
  declare roundNumber: number;
  declare turnNumber: number;
  declare wind: number;
  declare activeVehicleId: string;
  declare winnerTeam: string;
  declare roundEndReason: string;
  declare lastRewardLog: string;
  declare players: MapSchema<PlayerState>;
  declare slots: MapSchema<LobbySlotState>;
  declare vehicles: ArraySchema<CombatVehicleState>;

  constructor() {
    super();
    this.workingTitle = "Gravity Canyon";
    this.roomCode = "";
    this.phase = "lobby";
    this.status = "Waiting for players.";
    this.maxPlayers = 4;
    this.mode = DEFAULT_ROOM_SETTINGS.mode;
    this.matchLength = DEFAULT_ROOM_SETTINGS.matchLength;
    this.mapPick = DEFAULT_ROOM_SETTINGS.mapPick;
    this.friendlyFire = DEFAULT_ROOM_SETTINGS.friendlyFire;
    this.selectedMapId = "";
    this.selectedMapName = "";
    this.mapSeed = 0;
    this.targetScore = 1;
    this.redRoundWins = 0;
    this.blueRoundWins = 0;
    this.matchWinnerTeam = "";
    this.matchEndReason = "";
    this.terrainRevision = 0;
    this.terrainCraters = new ArraySchema<TerrainCraterState>();
    this.turnSequence = new ArraySchema<string>();
    this.turnDurationSeconds = TURN_SECONDS;
    this.turnStartedAtMs = 0;
    this.turnEndsAtMs = 0;
    this.turnSecondsRemaining = TURN_SECONDS;
    this.serverTimeMs = 0;
    this.turnAuthorityVersion = 0;
    this.lastAcceptedTurnIntentId = "";
    this.lastAcceptedTurnIntentType = "";
    this.lastAcceptedTurnIntentVehicleId = "";
    this.lastAcceptedTurnIntentSessionId = "";
    this.lastAcceptedTurnInputSeq = 0;
    this.lastShotId = "";
    this.lastShotShooterVehicleId = "";
    this.lastShotShooterSessionId = "";
    this.lastShotOriginX = 0;
    this.lastShotOriginY = 0;
    this.lastShotAngle = 0;
    this.lastShotPower = 0;
    this.lastShotFacing = 1;
    this.lastShotWind = 0;
    this.lastShotImpactX = 0;
    this.lastShotImpactY = 0;
    this.lastShotDirectHitVehicleId = "";
    this.lastShotTargetVehicleId = "";
    this.lastShotDamage = 0;
    this.lastShotTargetHpBefore = 0;
    this.lastShotTargetHpAfter = 0;
    this.lastShotTurnNumber = 0;
    this.lastShotTurnAuthorityVersion = 0;
    this.lastShotServerTimeMs = 0;
    this.hostSessionId = "";
    this.spectatorSessionIds = new ArraySchema<string>();
    this.roundNumber = 1;
    this.turnNumber = 0;
    this.wind = 0;
    this.activeVehicleId = "";
    this.winnerTeam = "";
    this.roundEndReason = "";
    this.lastRewardLog = "";
    this.players = new MapSchema<PlayerState>();
    this.slots = new MapSchema<LobbySlotState>();
    this.vehicles = new ArraySchema<CombatVehicleState>();
  }
}

defineTypes(PlayerState, {
  sessionId: "string",
  displayName: "string",
  team: "string",
  role: "string",
  joinOrder: "number",
  ready: "boolean",
  tokens: "number",
  equippedNameplate: "string",
  inventory: { array: "string" },
});

defineTypes(LobbySlotState, {
  slotId: "string",
  team: "string",
  ownerSessionId: "string",
  selectedCharacterId: "string",
  characterSelected: "boolean",
  active: "boolean",
});

defineTypes(CombatVehicleState, {
  vehicleId: "string",
  seatId: "string",
  ownerSessionId: "string",
  displayName: "string",
  team: "string",
  characterId: "string",
  className: "string",
  hp: "number",
  maxHp: "number",
  alive: "boolean",
  defeatReason: "string",
  x: "number",
  y: "number",
  moveUnits: "number",
  facing: "number",
  angle: "number",
});

defineTypes(TerrainCraterState, {
  x: "number",
  y: "number",
  radius: "number",
  depthFactor: "number",
});

defineTypes(GravityCanyonState, {
  workingTitle: "string",
  roomCode: "string",
  phase: "string",
  status: "string",
  maxPlayers: "number",
  mode: "string",
  matchLength: "string",
  mapPick: "string",
  friendlyFire: "boolean",
  selectedMapId: "string",
  selectedMapName: "string",
  mapSeed: "number",
  targetScore: "number",
  redRoundWins: "number",
  blueRoundWins: "number",
  matchWinnerTeam: "string",
  matchEndReason: "string",
  terrainRevision: "number",
  terrainCraters: { array: TerrainCraterState },
  turnSequence: { array: "string" },
  turnDurationSeconds: "number",
  turnStartedAtMs: "number",
  turnEndsAtMs: "number",
  turnSecondsRemaining: "number",
  serverTimeMs: "number",
  turnAuthorityVersion: "number",
  lastAcceptedTurnIntentId: "string",
  lastAcceptedTurnIntentType: "string",
  lastAcceptedTurnIntentVehicleId: "string",
  lastAcceptedTurnIntentSessionId: "string",
  lastAcceptedTurnInputSeq: "number",
  lastShotId: "string",
  lastShotShooterVehicleId: "string",
  lastShotShooterSessionId: "string",
  lastShotOriginX: "number",
  lastShotOriginY: "number",
  lastShotAngle: "number",
  lastShotPower: "number",
  lastShotFacing: "number",
  lastShotWind: "number",
  lastShotImpactX: "number",
  lastShotImpactY: "number",
  lastShotDirectHitVehicleId: "string",
  lastShotTargetVehicleId: "string",
  lastShotDamage: "number",
  lastShotTargetHpBefore: "number",
  lastShotTargetHpAfter: "number",
  lastShotTurnNumber: "number",
  lastShotTurnAuthorityVersion: "number",
  lastShotServerTimeMs: "number",
  hostSessionId: "string",
  spectatorSessionIds: { array: "string" },
  roundNumber: "number",
  turnNumber: "number",
  wind: "number",
  activeVehicleId: "string",
  winnerTeam: "string",
  roundEndReason: "string",
  lastRewardLog: "string",
  players: { map: PlayerState },
  slots: { map: LobbySlotState },
  vehicles: { array: CombatVehicleState },
});
