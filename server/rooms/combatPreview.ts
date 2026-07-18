import { unitDefinitionForCharacter } from "../../shared/content/v1Units.js";
import { vehicleHitZoneForCombatHull } from "../../shared/gameplay/combatHull.js";
import { resolveProjectileImpact, type ProjectileDamageEvent, type ProjectileImpactResolution } from "../../shared/gameplay/impact.js";
import { aimAngleForFacingChange, resolveMovementStep, type MovementDirection } from "../../shared/gameplay/movement.js";
import {
  isProjectileOutOfBounds,
  launchProjectile,
  stepProjectile,
  type ProjectileKinematics,
} from "../../shared/gameplay/projectile.js";
import {
  firstProjectileCollisionContact,
  firstTerrainContact,
  firstVehicleContact,
} from "../../shared/gameplay/projectileCollision.js";
import {
  buildTerrainHeightmap,
  craterTerrain,
  surfaceAt as terrainSurfaceAt,
} from "../../shared/gameplay/terrain.js";
import { settleVehicleOnTerrain } from "../../shared/gameplay/vehicleSettlement.js";
import type { CharacterId, Facing, TeamId, VehicleId } from "../../shared/model/gameTypes.js";
import { MAPS, pickMap, type SpawnPoint, type V1Map } from "../v1/maps.js";
import type { MatchLength } from "../v1/rules.js";
import {
  MAX_MOVE_UNITS,
  BUNGER_CRATER_RADIUS,
  BUNGER_DAMAGE_RADIUS,
  BUNGER_KNOCKBACK,
  CRATER_RADIUS,
  DEFAULT_TERRAIN_BREAKTHROUGH_Y,
  DEATH_SURFACE_Y,
  DAMAGE_RADIUS,
  GRAVITY,
  MOVE_MAX_X,
  MOVE_MIN_X,
  MOVE_PIXELS_PER_UNIT,
  MOVE_SPEED_PIXELS_PER_SECOND,
  MAX_CLIMB_SLOPE,
  MIN_ELEVATION_DEG,
  MAX_ELEVATION_DEG,
  MIN_FIRE_POWER,
  MAX_POWER,
  PROJECTILE_REPLAY_TIME_SCALE,
  VEHICLE_HALF_HEIGHT,
  VEHICLE_HALF_WIDTH,
  TERRAIN_CHANGE_SETTLE_PADDING,
  SETTLEMENT_SLOPE_SAMPLE_DISTANCE,
  SETTLEMENT_SLOPE_THRESHOLD,
  SETTLEMENT_SLOPE_STEP,
  SETTLEMENT_MAX_SLOPE_ITERATIONS,
  PROJECTILE_MUZZLE_DISTANCE,
  PROJECTILE_MUZZLE_Y_OFFSET,
  PROJECTILE_OUT_OF_BOUNDS_LOWER_Y_MARGIN,
  PROJECTILE_OUT_OF_BOUNDS_UPPER_Y_MARGIN,
  PROJECTILE_RADIUS,
  SHOT_SPEED_MAX,
  SHOT_SPEED_MIN,
  V1_WORLD_HEIGHT,
  V1_WORLD_WIDTH,
  VOID_SURFACE_Y,
  WIND_FORCE,
} from "../../shared/v1/tuning.js";
import { buildPreviewSlots, type PreviewSlot } from "./autoRoomLobby.js";
import {
  CombatVehicleState,
  GravityCanyonState,
  PlayerState,
  TerrainCraterState,
} from "../schema/GravityCanyonState.js";
import {
  activeOwnedVehicleForClient,
  beginServerTurn,
  clearServerTurnAuthority,
  acceptTurnIntentForClient,
  refreshServerTurnClock,
  serverTurnHasStarted,
  type TurnAuthorityOptions,
} from "./turnAuthority.js";

const VEHICLE_MAX_HP = 100;
const SERVER_PROJECTILE_STEP_SECONDS = 1 / 60;
const SERVER_PROJECTILE_MAX_STEPS = 60 * 12;
const POST_SHOT_TURN_START_GRACE_MS = 650;
const MOVEMENT_DIRECTIONS = new Map<unknown, MovementDirection>([
  [-1, -1],
  [1, 1],
]);

type CombatPreviewSetup = {
  mapSeed: number;
  previewSlots: PreviewSlot[];
  selectedMap: V1Map;
};

type PreviewShot = {
  activeVehicle: CombatVehicleState;
  resolution: PreviewShotResolution;
};

type PreviewShotResolution =
  | {
      kind: "impact";
      x: number;
      y: number;
      directHitId: string;
      impact: ProjectileImpactResolution;
      flightSeconds: number;
    }
  | {
      kind: "out-of-bounds";
      flightSeconds: number;
    };

type LastShotImpactSnapshot = {
  x: number;
  y: number;
  directHitVehicleId: string;
};

type LastShotDamageSnapshot = {
  targetVehicleId: string;
  damage: number;
  hpBefore: number;
  hpAfter: number;
};

type PreviewMoveInput = {
  intentId?: unknown;
  action?: unknown;
  direction?: unknown;
  deltaSeconds?: unknown;
};

type PreviewAimInput = {
  intentId?: unknown;
  action?: unknown;
  angle?: unknown;
  facing?: unknown;
};

type PreviewFireInput = {
  angle?: unknown;
  power?: unknown;
  facing?: unknown;
  clientPredictedX?: unknown;
  clientPredictedY?: unknown;
};

export function startCombatPreview(state: GravityCanyonState, options: TurnAuthorityOptions = {}): void {
  const setup = buildCombatPreviewSetup(state);

  resetCombatPreviewRound(state, setup);
  rebuildPreviewVehicles(state, setup);
  setFirstActivePreviewVehicle(state);
  beginServerTurn(state, options);
}

function buildCombatPreviewSetup(state: GravityCanyonState): CombatPreviewSetup {
  const mapSeed = mapSeedForRound(state.roundNumber);
  const selectedMap = pickMap(state.mapPick, mapSeed);
  const previewSlots = buildPreviewSlots({
    mode: state.mode,
    slots: Array.from(state.slots.values()),
  });

  return { mapSeed, previewSlots, selectedMap };
}

function resetCombatPreviewRound(state: GravityCanyonState, setup: CombatPreviewSetup): void {
  state.phase = "combat-preview";
  state.winnerTeam = "";
  state.roundEndReason = "";
  state.turnNumber = 1;
  state.wind = rollWind();
  state.selectedMapId = setup.selectedMap.id;
  state.selectedMapName = setup.selectedMap.name;
  state.mapSeed = setup.mapSeed;
  state.targetScore = targetScoreForMatchLength(state.matchLength);
  state.terrainCraters.clear();
  state.terrainRevision += 1;
  state.vehicles.splice(0, state.vehicles.length);
  clearLastShot(state);
  replaceTurnSequence(state, setup.previewSlots.map((slot) => slot.slotId));
}

function rebuildPreviewVehicles(state: GravityCanyonState, setup: CombatPreviewSetup): void {
  for (const slot of setup.previewSlots) {
    const owner = state.players.get(slot.ownerSessionId);
    if (owner) {
      state.vehicles.push(
        createPreviewVehicle(slot.slotId, slot.selectedCharacterId, owner, setup.selectedMap.spawns[slot.slotId]),
      );
    }
  }
}

function setFirstActivePreviewVehicle(state: GravityCanyonState): void {
  const activeVehicle = state.vehicles[0];
  state.activeVehicleId = activeVehicle?.vehicleId ?? "";
  state.status = activeVehicle
    ? `Round ${state.roundNumber} started. ${activeVehicle.displayName} has the first shot.`
    : "Round started.";
}

export function clearCombatPreview(state: GravityCanyonState): void {
  state.turnNumber = 0;
  state.wind = 0;
  state.activeVehicleId = "";
  state.winnerTeam = "";
  state.roundEndReason = "";
  state.selectedMapId = "";
  state.selectedMapName = "";
  state.mapSeed = 0;
  state.targetScore = targetScoreForMatchLength(state.matchLength);
  state.turnSequence.splice(0, state.turnSequence.length);
  state.vehicles.splice(0, state.vehicles.length);
  clearLastShot(state);
  clearServerTurnAuthority(state);
}

export function previewMoveForClient(
  state: GravityCanyonState,
  sessionId: string,
  message: PreviewMoveInput | null | undefined,
  options: TurnAuthorityOptions = {},
): boolean {
  const direction = movementDirectionFromMessage(message);
  if (direction === 0) {
    return false;
  }

  return applyAcceptedPreviewMove(state, sessionId, message, direction, movementDeltaSecondsFrom(message), options);
}

export function previewAimForClient(
  state: GravityCanyonState,
  sessionId: string,
  message: PreviewAimInput | null | undefined,
  options: TurnAuthorityOptions = {},
): boolean {
  if (!acceptTurnIntentForClient(state, sessionId, { ...message, action: "aim" }, options)) {
    return false;
  }

  const activeVehicle = activeOwnedVehicleForClient(state, sessionId);
  if (!activeVehicle) {
    return false;
  }

  activeVehicle.angle = sanitizedAimAngle(activeVehicle, message);
  state.status = `${activeVehicle.displayName} server aimed.`;
  return true;
}

function applyAcceptedPreviewMove(
  state: GravityCanyonState,
  sessionId: string,
  message: PreviewMoveInput | null | undefined,
  direction: -1 | 1,
  deltaSeconds: number,
  options: TurnAuthorityOptions,
): boolean {
  if (!acceptTurnIntentForClient(state, sessionId, { ...message, action: "move" }, options)) {
    return false;
  }

  const activeVehicle = activeOwnedVehicleForClient(state, sessionId);
  if (!activeVehicle) {
    return false;
  }

  return moveActivePreviewVehicle(state, activeVehicle, direction, deltaSeconds);
}

function moveActivePreviewVehicle(
  state: GravityCanyonState,
  activeVehicle: CombatVehicleState,
  direction: -1 | 1,
  deltaSeconds: number,
): boolean {
  const selectedMap = selectedMapForState(state);
  const terrain = terrainForMap(selectedMap);
  const turned = applyPreviewFacing(activeVehicle, direction);
  const step = resolveMovementStep({
    x: activeVehicle.x,
    moveUnits: activeVehicle.moveUnits,
    direction,
    deltaSeconds,
    moveSpeedPixelsPerSecond: MOVE_SPEED_PIXELS_PER_SECOND,
    movePixelsPerUnit: MOVE_PIXELS_PER_UNIT,
    minX: MOVE_MIN_X,
    maxX: MOVE_MAX_X,
    maxClimbSlope: MAX_CLIMB_SLOPE,
    fallSurfaceY: selectedMap.deathPlaneY,
    surfaceAt: (x) => terrainSurfaceAt(terrain, x, { worldWidth: selectedMap.worldWidth, voidSurfaceY: VOID_SURFACE_Y }),
  });

  if (!step.moved) {
    return recordPreviewTurnStatus(state, activeVehicle, direction, turned);
  }

  applyPreviewMovementStep(activeVehicle, direction, step, selectedMap, terrain);
  state.status = `${activeVehicle.displayName} server moved ${directionLabel(direction)}.`;
  return true;
}

function recordPreviewTurnStatus(
  state: GravityCanyonState,
  activeVehicle: CombatVehicleState,
  direction: -1 | 1,
  turned: boolean,
): boolean {
  if (!turned) {
    return false;
  }

  state.status = `${activeVehicle.displayName} server turned ${directionLabel(direction)}.`;
  return true;
}

function directionLabel(direction: -1 | 1): "left" | "right" {
  return direction > 0 ? "right" : "left";
}

function applyPreviewFacing(activeVehicle: CombatVehicleState, direction: -1 | 1): boolean {
  if (activeVehicle.facing === direction) {
    return false;
  }

  activeVehicle.angle = aimAngleForFacingChange({
    currentAngle: activeVehicle.angle,
    currentFacing: facingFromNumber(activeVehicle.facing),
    nextFacing: direction,
    minElevationDeg: MIN_ELEVATION_DEG,
    maxElevationDeg: MAX_ELEVATION_DEG,
  });
  activeVehicle.facing = direction;
  return true;
}

function applyPreviewMovementStep(
  activeVehicle: CombatVehicleState,
  direction: MovementDirection,
  step: { x: number; moveUnits: number },
  selectedMap: V1Map,
  terrain: readonly number[],
): void {
  activeVehicle.facing = direction;
  activeVehicle.x = step.x;
  activeVehicle.y = vehicleYOnSurface(terrainSurfaceAt(terrain, step.x, {
    worldWidth: selectedMap.worldWidth,
    voidSurfaceY: VOID_SURFACE_Y,
  }));
  activeVehicle.moveUnits = step.moveUnits;
}

export function advanceTimedOutPreviewTurn(
  state: GravityCanyonState,
  options: TurnAuthorityOptions = {},
): boolean {
  if (state.phase !== "combat-preview") {
    return false;
  }

  refreshServerTurnClock(state, options);
  if (state.turnSecondsRemaining > 0) {
    return false;
  }

  return resolveTimedOutPreviewTurn(state, options);
}

function resolveTimedOutPreviewTurn(state: GravityCanyonState, options: TurnAuthorityOptions): boolean {
  const winner = winningTeamForState(state);
  if (winner) {
    return finishTimedOutPreviewRound(state, winner);
  }

  return advanceTimedOutPreviewTurnToNextVehicle(state, options);
}

function finishTimedOutPreviewRound(state: GravityCanyonState, winner: TeamId): boolean {
  finishRound(state, winner);
  return true;
}

function advanceTimedOutPreviewTurnToNextVehicle(
  state: GravityCanyonState,
  options: TurnAuthorityOptions,
): boolean {
  const timedOutVehicle = activeVehicleForPreviewState(state);
  const nextVehicle = nextAliveVehicleAfterTimeout(state, timedOutVehicle);
  if (!nextVehicle) {
    return false;
  }

  applyTimedOutPreviewTurnAdvance(state, nextVehicle, options);
  state.status = timedOutPreviewTurnStatus(timedOutVehicle, nextVehicle);
  return true;
}

function activeVehicleForPreviewState(state: GravityCanyonState): CombatVehicleState | undefined {
  return state.vehicles.find((vehicle) => vehicle.vehicleId === state.activeVehicleId);
}

function nextAliveVehicleAfterTimeout(
  state: GravityCanyonState,
  timedOutVehicle: CombatVehicleState | undefined,
): CombatVehicleState | undefined {
  const currentVehicleId = timedOutVehicle ? timedOutVehicle.vehicleId : state.activeVehicleId;
  return nextAliveVehicle(state, currentVehicleId);
}

function applyTimedOutPreviewTurnAdvance(
  state: GravityCanyonState,
  nextVehicle: CombatVehicleState,
  options: TurnAuthorityOptions,
): void {
  state.turnNumber += 1;
  state.wind = rollWind();
  state.activeVehicleId = nextVehicle.vehicleId;
  beginServerTurn(state, options);
}

function timedOutPreviewTurnStatus(
  timedOutVehicle: CombatVehicleState | undefined,
  nextVehicle: CombatVehicleState,
): string {
  const timedOutName = timedOutVehicle ? timedOutVehicle.displayName : "Active vehicle";
  return `${timedOutName} timed out. ${nextVehicle.displayName} is up.`;
}

export function previewFireForClient(
  state: GravityCanyonState,
  sessionId: string,
  options: TurnAuthorityOptions = {},
  input: PreviewFireInput = {},
): void {
  const shotServerTimeMs = options.nowMs ?? Date.now();
  const activeVehicle = activeFireVehicleForClient(state, sessionId, { ...options, nowMs: shotServerTimeMs });
  if (!activeVehicle) {
    return;
  }

  if (finishRoundWhenNoEnemyRemains(state, activeVehicle)) {
    return;
  }

  const fire = sanitizedFireInput(activeVehicle, input);
  const shot = {
    activeVehicle,
    resolution: resolvePreviewProjectile(state, activeVehicle, fire),
  };
  recordLastShot(state, shot, fire, { ...options, nowMs: shotServerTimeMs });
  activeVehicle.angle = fire.angle;
  activeVehicle.facing = fire.facing;
  applyPreviewShotResolution(state, shot.resolution);
  resolvePreviewShot(state, shot, {
    ...options,
    nowMs: shotServerTimeMs,
    startsAtMs: nextTurnStartTimeMs(shot.resolution, shotServerTimeMs),
  });
}

function activeFireVehicleForClient(
  state: GravityCanyonState,
  sessionId: string,
  options: TurnAuthorityOptions,
): CombatVehicleState | undefined {
  refreshServerTurnClock(state, options);
  return serverTurnHasStarted(state) ? activeOwnedVehicleForClient(state, sessionId) : undefined;
}

function finishRoundWhenNoEnemyRemains(
  state: GravityCanyonState,
  activeVehicle: CombatVehicleState,
): boolean {
  if (hasEnemyForVehicle(state, activeVehicle)) {
    return false;
  }

  finishRound(state, activeVehicle.team);
  return true;
}

function hasEnemyForVehicle(state: GravityCanyonState, activeVehicle: CombatVehicleState): boolean {
  return state.vehicles.some((vehicle) => vehicle.team !== activeVehicle.team && vehicle.alive);
}

function applyPreviewShotResolution(state: GravityCanyonState, resolution: PreviewShotResolution): void {
  if (resolution.kind !== "impact") {
    return;
  }

  const selectedMap = selectedMapForState(state);
  const terrain = terrainAfterImpact(state, selectedMap, resolution);
  appendTerrainCrater(state, resolution);
  state.terrainRevision += 1;
  applyPreviewVehicleUpdates(state, resolution.impact.vehicleUpdates);
  settlePreviewVehicles(state, selectedMap, terrain, resolution);
}

function applyPreviewVehicleUpdates(
  state: GravityCanyonState,
  updates: ProjectileImpactResolution["vehicleUpdates"],
): void {
  for (const update of updates) {
    const vehicle = state.vehicles.find((candidate) => candidate.vehicleId === update.vehicleId);
    if (!vehicle) {
      continue;
    }

    vehicle.hp = update.hp;
    vehicle.alive = update.alive;
    vehicle.x = update.x;
    vehicle.defeatReason = update.defeatReason ?? "";
  }
}

function terrainAfterImpact(
  state: GravityCanyonState,
  selectedMap: V1Map,
  resolution: Extract<PreviewShotResolution, { kind: "impact" }>,
): number[] {
  return craterTerrain({
    terrain: currentTerrainForState(state, selectedMap),
    impactX: resolution.x,
    impactY: resolution.y,
    radius: resolution.impact.craterRadius,
    depth: resolution.impact.craterRadius * resolution.impact.craterDepthFactor,
    voidSurfaceY: VOID_SURFACE_Y,
    breakthroughY: DEFAULT_TERRAIN_BREAKTHROUGH_Y,
  });
}

function settlePreviewVehicles(
  state: GravityCanyonState,
  selectedMap: V1Map,
  terrain: readonly number[],
  resolution: Extract<PreviewShotResolution, { kind: "impact" }>,
): void {
  for (const vehicle of state.vehicles) {
    if (!vehicle.alive) continue;
    settlePreviewVehicle(vehicle, selectedMap, terrain, resolution);
  }
}

function settlePreviewVehicle(
  vehicle: CombatVehicleState,
  selectedMap: V1Map,
  terrain: readonly number[],
  resolution: Extract<PreviewShotResolution, { kind: "impact" }>,
): void {
  const surfaceAt = (x: number) => terrainSurfaceAt(terrain, x, {
    worldWidth: selectedMap.worldWidth,
    voidSurfaceY: VOID_SURFACE_Y,
  });
  const settled = settleVehicleOnTerrain({
    vehicle: { id: vehicle.vehicleId, x: vehicle.x, y: vehicle.y, hp: vehicle.hp, alive: vehicle.alive },
    tuning: serverSettlementTuning(),
    fallbackFallStartY: vehicle.y,
    changedX: resolution.x,
    changedRadius: resolution.impact.changedRadius,
    forceSettle: true,
    surfaceAt,
  });
  vehicle.x = settled.x;
  vehicle.y = settled.y;
  if (settled.motion?.kind === "falling") {
    vehicle.hp = 0;
    vehicle.alive = false;
    vehicle.defeatReason = "void";
    vehicle.y = DEATH_SURFACE_Y;
  }
}

function serverSettlementTuning() {
  return {
    vehicleHalfWidth: VEHICLE_HALF_WIDTH,
    vehicleHalfHeight: VEHICLE_HALF_HEIGHT,
    moveMinX: MOVE_MIN_X,
    moveMaxX: MOVE_MAX_X,
    deathSurfaceY: DEATH_SURFACE_Y,
    terrainChangePadding: TERRAIN_CHANGE_SETTLE_PADDING,
    slopeSampleDistance: SETTLEMENT_SLOPE_SAMPLE_DISTANCE,
    slopeThreshold: SETTLEMENT_SLOPE_THRESHOLD,
    slopeStep: SETTLEMENT_SLOPE_STEP,
    maxSlopeIterations: SETTLEMENT_MAX_SLOPE_ITERATIONS,
  };
}

function resolvePreviewShot(state: GravityCanyonState, shot: PreviewShot, options: TurnAuthorityOptions): void {
  const winner = winningTeamForState(state);
  if (winner) {
    finishRound(state, winner);
    return;
  }

  advancePreviewTurn(state, shot, options);
}

function resolvePreviewProjectile(
  state: GravityCanyonState,
  activeVehicle: CombatVehicleState,
  fire: { angle: number; power: number; facing: Facing },
): PreviewShotResolution {
  const selectedMap = selectedMapForState(state);
  const terrain = currentTerrainForState(state, selectedMap);
  let projectile = launchProjectile({
    shooterX: activeVehicle.x,
    shooterY: activeVehicle.y,
    angleDeg: fire.angle,
    power: fire.power,
    maxPower: MAX_POWER,
    shotSpeedMin: SHOT_SPEED_MIN,
    shotSpeedMax: SHOT_SPEED_MAX,
    muzzleDistance: PROJECTILE_MUZZLE_DISTANCE,
    muzzleYOffset: PROJECTILE_MUZZLE_Y_OFFSET,
  });

  for (let stepIndex = 0; stepIndex < SERVER_PROJECTILE_MAX_STEPS; stepIndex += 1) {
    const step = stepProjectile({
      projectile,
      deltaSeconds: SERVER_PROJECTILE_STEP_SECONDS,
      wind: serverWindForProjectile(state.wind),
      windForce: WIND_FORCE,
      gravity: GRAVITY,
    });
    const collision = firstPreviewProjectileCollision(state, activeVehicle, selectedMap, terrain, step);
    if (collision) {
      return previewImpactResolution(state, activeVehicle, collision, flightSecondsForStep(stepIndex));
    }

    projectile = step.projectile;
    if (isProjectileOutOfBounds(projectile, projectileBounds())) {
      return { kind: "out-of-bounds", flightSeconds: flightSecondsForStep(stepIndex) };
    }
  }

  return { kind: "out-of-bounds", flightSeconds: SERVER_PROJECTILE_MAX_STEPS * SERVER_PROJECTILE_STEP_SECONDS };
}

function firstPreviewProjectileCollision(
  state: GravityCanyonState,
  activeVehicle: CombatVehicleState,
  selectedMap: V1Map,
  terrain: readonly number[],
  step: { startX: number; startY: number; endX: number; endY: number; projectile: ProjectileKinematics },
): { x: number; y: number; directHitId?: string } | undefined {
  const vehicleContact = firstVehicleContact({
    startX: step.startX,
    startY: step.startY,
    endX: step.endX,
    endY: step.endY,
    projectileRadius: PROJECTILE_RADIUS,
    zones: Array.from(state.vehicles)
      .filter(
        (vehicle) =>
          vehicle.alive &&
          vehicle.vehicleId !== activeVehicle.vehicleId &&
          vehicle.team !== activeVehicle.team,
      )
      .map((vehicle) => ({
        id: vehicle.vehicleId,
        ...vehicleHitZoneForCombatHull(
          { x: vehicle.x, y: vehicle.y, facing: facingFromNumber(vehicle.facing) },
          unitDefinitionForCharacter(vehicle.characterId).combatHull,
        ),
      })),
  });
  const terrainContact = firstTerrainContact({
    startX: step.startX,
    startY: step.startY,
    endX: step.endX,
    endY: step.endY,
    projectileRadius: PROJECTILE_RADIUS,
    worldWidth: selectedMap.worldWidth,
    surfaceAt: (x) => terrainSurfaceAt(terrain, x, { worldWidth: selectedMap.worldWidth, voidSurfaceY: VOID_SURFACE_Y }),
  });

  return firstProjectileCollisionContact(vehicleContact, terrainContact);
}

function previewImpactResolution(
  state: GravityCanyonState,
  activeVehicle: CombatVehicleState,
  collision: { x: number; y: number; directHitId?: string },
  flightSeconds: number,
): PreviewShotResolution {
  const activeUnit = unitDefinitionForCharacter(activeVehicle.characterId);
  return {
    kind: "impact",
    x: collision.x,
    y: collision.y,
    directHitId: collision.directHitId ?? "",
    flightSeconds,
    impact: resolveProjectileImpact({
      x: collision.x,
      y: collision.y,
      directHitId: collision.directHitId,
      shooter: {
        id: activeVehicle.vehicleId,
        team: activeVehicle.team,
        classId: activeUnit.classId,
      },
      vehicles: Array.from(state.vehicles).map((vehicle) => ({
        id: vehicle.vehicleId,
        username: vehicle.displayName,
        team: vehicle.team,
        alive: vehicle.alive,
        hp: vehicle.hp,
        x: vehicle.x,
        hitZone: vehicleHitZoneForCombatHull(
          { x: vehicle.x, y: vehicle.y, facing: facingFromNumber(vehicle.facing) },
          unitDefinitionForCharacter(vehicle.characterId).combatHull,
        ),
      })),
      tuning: {
        craterRadius: CRATER_RADIUS,
        bungerCraterRadius: BUNGER_CRATER_RADIUS,
        damageRadius: DAMAGE_RADIUS,
        bungerDamageRadius: BUNGER_DAMAGE_RADIUS,
        bungerKnockback: BUNGER_KNOCKBACK,
        moveMinX: MOVE_MIN_X,
        moveMaxX: MOVE_MAX_X,
      },
    }),
  };
}

function flightSecondsForStep(stepIndex: number): number {
  return (stepIndex + 1) * SERVER_PROJECTILE_STEP_SECONDS;
}

function nextTurnStartTimeMs(resolution: PreviewShotResolution, shotServerTimeMs: number): number {
  return shotServerTimeMs + Math.ceil(visualReplaySeconds(resolution) * 1_000) + POST_SHOT_TURN_START_GRACE_MS;
}

function visualReplaySeconds(resolution: PreviewShotResolution): number {
  return resolution.flightSeconds / PROJECTILE_REPLAY_TIME_SCALE;
}

function projectileBounds() {
  return {
    worldWidth: V1_WORLD_WIDTH,
    worldHeight: V1_WORLD_HEIGHT,
    lowerYMargin: PROJECTILE_OUT_OF_BOUNDS_LOWER_Y_MARGIN,
    upperYMargin: PROJECTILE_OUT_OF_BOUNDS_UPPER_Y_MARGIN,
  };
}

function serverWindForProjectile(wind: number): number {
  return wind / 10;
}

function facingFromNumber(facing: number): Facing {
  return facing < 0 ? -1 : 1;
}

function advancePreviewTurn(state: GravityCanyonState, shot: PreviewShot, options: TurnAuthorityOptions): void {
  const nextVehicle = nextAliveVehicle(state, shot.activeVehicle.vehicleId);
  state.turnNumber += 1;
  state.wind = rollWind();
  state.activeVehicleId = nextVehicle?.vehicleId ?? "";
  beginNextPreviewTurn(state, nextVehicle, options);
  state.status = previewTurnAdvanceStatus(shot, nextVehicle);
}

function beginNextPreviewTurn(
  state: GravityCanyonState,
  nextVehicle: CombatVehicleState | undefined,
  options: TurnAuthorityOptions,
): void {
  if (nextVehicle) {
    beginServerTurn(state, options);
  }
}

function previewTurnAdvanceStatus(shot: PreviewShot, nextVehicle: CombatVehicleState | undefined): string {
  const result = previewShotResultText(shot.resolution);
  if (!nextVehicle) {
    return `${shot.activeVehicle.displayName}'s server shot ${result}.`;
  }

  return `${shot.activeVehicle.displayName}'s server shot ${result}. ${nextVehicle.displayName} is up.`;
}

function previewShotResultText(resolution: PreviewShotResolution): string {
  return (
    previewOutOfBoundsText(resolution) ??
    previewDirectHitText(resolution) ??
    previewSplashText(resolution) ??
    "impacted terrain"
  );
}

function previewOutOfBoundsText(resolution: PreviewShotResolution): string | undefined {
  return resolution.kind === "out-of-bounds" ? "flew out of bounds" : undefined;
}

function previewDirectHitText(resolution: PreviewShotResolution): string | undefined {
  if (resolution.kind !== "impact" || !resolution.directHitId) {
    return undefined;
  }

  const directHit = vehicleDamageEventFor(resolution.impact, resolution.directHitId);
  return directHit ? `hit ${directHit.username} for ${directHit.damage}` : undefined;
}

function previewSplashText(resolution: PreviewShotResolution): string | undefined {
  if (resolution.kind !== "impact" || resolution.impact.damageEvents.length === 0) {
    return undefined;
  }

  return `splashed ${resolution.impact.damageEvents.map((event) => `${event.username} for ${event.damage}`).join(", ")}`;
}

export function createPreviewVehicle(
  slotId: VehicleId,
  characterId: CharacterId,
  player: PlayerState,
  spawn: SpawnPoint = fallbackSpawnForSlot(slotId),
): CombatVehicleState {
  const unit = unitDefinitionForCharacter(characterId);
  const team = teamForSlot(slotId);
  const vehicle = new CombatVehicleState();
  vehicle.vehicleId = slotId;
  vehicle.seatId = slotId;
  vehicle.ownerSessionId = player.sessionId;
  vehicle.displayName = `${player.displayName} / ${unit.username}`;
  vehicle.team = team;
  vehicle.characterId = characterId;
  vehicle.className = unit.className;
  vehicle.hp = VEHICLE_MAX_HP;
  vehicle.maxHp = VEHICLE_MAX_HP;
  vehicle.alive = true;
  vehicle.defeatReason = "";
  vehicle.x = spawn.x;
  vehicle.y = vehicleYOnSurface(spawn.y);
  vehicle.moveUnits = MAX_MOVE_UNITS;
  vehicle.facing = spawn.facing;
  vehicle.angle = initialAngleForFacing(spawn.facing);
  return vehicle;
}

function vehicleYOnSurface(surfaceY: number): number {
  return surfaceY - VEHICLE_HALF_HEIGHT;
}

export function teamForSlot(slotId: VehicleId): TeamId {
  return slotId.startsWith("red-") ? "red" : "blue";
}

function nextAliveVehicle(state: GravityCanyonState, currentVehicleId: string): CombatVehicleState | undefined {
  const vehicles = Array.from(state.vehicles);
  const currentIndex = vehicles.findIndex((vehicle) => vehicle.vehicleId === currentVehicleId);

  for (let offset = 1; offset <= vehicles.length; offset += 1) {
    const candidate = vehicles[(currentIndex + offset + vehicles.length) % vehicles.length];
    if (candidate?.alive) {
      return candidate;
    }
  }

  return undefined;
}

function winningTeamForState(state: GravityCanyonState): TeamId | undefined {
  const aliveTeams = new Set(state.vehicles.filter((vehicle) => vehicle.alive).map((vehicle) => vehicle.team));
  return aliveTeams.size === 1 ? Array.from(aliveTeams)[0] : undefined;
}

function finishRound(state: GravityCanyonState, winnerTeam: TeamId): void {
  incrementRoundScore(state, winnerTeam);
  const matchWon = roundScoreForTeam(state, winnerTeam) >= state.targetScore;
  applyRoundResultState(state, winnerTeam, matchWon);
  rewardWinningPlayers(state, winnerTeam);
  state.status = roundResultStatus(state, winnerTeam, matchWon);
  state.lastRewardLog = `${capitalize(winnerTeam)} team earned 1 preview token.`;
}

function applyRoundResultState(state: GravityCanyonState, winnerTeam: TeamId, matchWon: boolean): void {
  state.phase = matchWon ? "match-over" : "round-over";
  state.winnerTeam = winnerTeam;
  state.roundEndReason = "team-eliminated";
  state.matchWinnerTeam = matchWon ? winnerTeam : "";
  state.matchEndReason = matchWon ? "target-score-reached" : "";
  state.activeVehicleId = "";
  clearServerTurnAuthority(state);
}

function rewardWinningPlayers(state: GravityCanyonState, winnerTeam: TeamId): void {
  const rewardedSessionIds = new Set<string>();
  const winners = state.vehicles.filter((vehicle) => vehicle.team === winnerTeam);
  for (const vehicle of winners) {
    const player = state.players.get(vehicle.ownerSessionId);
    if (player && !rewardedSessionIds.has(player.sessionId)) {
      player.tokens += 1;
      rewardedSessionIds.add(player.sessionId);
    }
  }
}

function roundResultStatus(state: GravityCanyonState, winnerTeam: TeamId, matchWon: boolean): string {
  return matchWon
    ? `${capitalize(winnerTeam)} team wins the match ${state.redRoundWins}-${state.blueRoundWins}.`
    : `${capitalize(winnerTeam)} team wins round ${state.roundNumber}.`;
}

export function resetMatchForRematch(state: GravityCanyonState): void {
  state.roundNumber = 1;
  state.redRoundWins = 0;
  state.blueRoundWins = 0;
  state.matchWinnerTeam = "";
  state.matchEndReason = "";
  for (const player of state.players.values()) player.ready = false;
  clearCombatPreview(state);
  state.phase = "ready";
}

function incrementRoundScore(state: GravityCanyonState, winnerTeam: TeamId): void {
  if (winnerTeam === "red") state.redRoundWins += 1;
  else state.blueRoundWins += 1;
}

function roundScoreForTeam(state: GravityCanyonState, team: TeamId): number {
  return team === "red" ? state.redRoundWins : state.blueRoundWins;
}

function rollWind(): number {
  return Math.floor(Math.random() * 25) - 12;
}

function selectedMapForState(state: GravityCanyonState): V1Map {
  const explicitMap = MAPS.find((map) => map.id === state.selectedMapId);
  return explicitMap ?? pickMap(state.mapPick, state.mapSeed || mapSeedForRound(state.roundNumber));
}

function terrainForMap(map: V1Map): number[] {
  return buildTerrainHeightmap({
    worldWidth: map.worldWidth,
    voidSurfaceY: VOID_SURFACE_Y,
    segments: map.previewSegments,
  });
}

function currentTerrainForState(state: GravityCanyonState, map: V1Map): number[] {
  let terrain = terrainForMap(map);
  for (const crater of state.terrainCraters) {
    terrain = craterTerrain({
      terrain,
      impactX: crater.x,
      impactY: crater.y,
      radius: crater.radius,
      depth: crater.radius * crater.depthFactor,
      voidSurfaceY: VOID_SURFACE_Y,
      breakthroughY: DEFAULT_TERRAIN_BREAKTHROUGH_Y,
    });
  }
  return terrain;
}

function appendTerrainCrater(
  state: GravityCanyonState,
  resolution: Extract<PreviewShotResolution, { kind: "impact" }>,
): void {
  const crater = new TerrainCraterState();
  crater.x = resolution.x;
  crater.y = resolution.y;
  crater.radius = resolution.impact.craterRadius;
  crater.depthFactor = resolution.impact.craterDepthFactor;
  state.terrainCraters.push(crater);
}

function movementDirectionFromMessage(message: PreviewMoveInput | null | undefined): MovementDirection {
  return MOVEMENT_DIRECTIONS.get(message?.direction) ?? 0;
}

function movementDeltaSecondsFrom(message: PreviewMoveInput | null | undefined): number {
  return typeof message?.deltaSeconds === "number" && Number.isFinite(message.deltaSeconds)
    ? clamp(message.deltaSeconds, 0, 0.5)
    : 0.05;
}

function sanitizedAimAngle(activeVehicle: CombatVehicleState, input: PreviewAimInput | null | undefined): number {
  return clampAngleForFacing(numberOr(input?.angle, activeVehicle.angle), facingFromNumber(activeVehicle.facing));
}

function sanitizedFireInput(activeVehicle: CombatVehicleState, input: PreviewFireInput): {
  angle: number;
  power: number;
  facing: 1 | -1;
} {
  const facing = input.facing === -1 ? -1 : input.facing === 1 ? 1 : activeVehicle.facing === -1 ? -1 : 1;
  return {
    angle: clampAngleForFacing(numberOr(input.angle, activeVehicle.angle), facing),
    power: clamp(numberOr(input.power, MAX_POWER), MIN_FIRE_POWER, MAX_POWER),
    facing,
  };
}

function recordLastShot(
  state: GravityCanyonState,
  shot: PreviewShot,
  fire: { angle: number; power: number; facing: 1 | -1 },
  options: TurnAuthorityOptions,
): void {
  const impact = lastShotImpactSnapshotFor(shot.resolution);
  const damage = lastShotDamageSnapshotFor(shot.resolution);
  state.lastShotId = `round-${state.roundNumber}-turn-${state.turnNumber}-${shot.activeVehicle.vehicleId}-${state.turnAuthorityVersion}`;
  state.lastShotShooterVehicleId = shot.activeVehicle.vehicleId;
  state.lastShotShooterSessionId = shot.activeVehicle.ownerSessionId;
  state.lastShotOriginX = shot.activeVehicle.x;
  state.lastShotOriginY = shot.activeVehicle.y;
  state.lastShotAngle = fire.angle;
  state.lastShotPower = fire.power;
  state.lastShotFacing = fire.facing;
  state.lastShotWind = state.wind;
  state.lastShotImpactX = impact.x;
  state.lastShotImpactY = impact.y;
  state.lastShotDirectHitVehicleId = impact.directHitVehicleId;
  state.lastShotTargetVehicleId = damage.targetVehicleId;
  state.lastShotDamage = damage.damage;
  state.lastShotTargetHpBefore = damage.hpBefore;
  state.lastShotTargetHpAfter = damage.hpAfter;
  state.lastShotTurnNumber = state.turnNumber;
  state.lastShotTurnAuthorityVersion = state.turnAuthorityVersion;
  state.lastShotServerTimeMs = options.nowMs ?? Date.now();
}

function lastShotImpactSnapshotFor(resolution: PreviewShotResolution): LastShotImpactSnapshot {
  return resolution.kind === "impact"
    ? { x: resolution.x, y: resolution.y, directHitVehicleId: resolution.directHitId }
    : { x: 0, y: 0, directHitVehicleId: "" };
}

function lastShotDamageSnapshotFor(resolution: PreviewShotResolution): LastShotDamageSnapshot {
  return lastShotDamageSnapshotFrom(primaryDamageEventFor(resolution));
}

function primaryDamageEventFor(resolution: PreviewShotResolution): ProjectileDamageEvent | undefined {
  return resolution.kind === "impact" ? impactPrimaryDamageEvent(resolution) : undefined;
}

function impactPrimaryDamageEvent(
  resolution: Extract<PreviewShotResolution, { kind: "impact" }>,
): ProjectileDamageEvent | undefined {
  return resolution.directHitId
    ? vehicleDamageEventFor(resolution.impact, resolution.directHitId)
    : resolution.impact.damageEvents[0];
}

function lastShotDamageSnapshotFrom(event: ProjectileDamageEvent | undefined): LastShotDamageSnapshot {
  return event
    ? {
        targetVehicleId: event.vehicleId,
        damage: event.damage,
        hpBefore: event.hpBefore,
        hpAfter: event.hpAfter,
      }
    : { targetVehicleId: "", damage: 0, hpBefore: 0, hpAfter: 0 };
}

function vehicleDamageEventFor(
  impact: ProjectileImpactResolution,
  vehicleId: string,
): ProjectileDamageEvent | undefined {
  return impact.damageEvents.find((event) => event.vehicleId === vehicleId);
}

function clearLastShot(state: GravityCanyonState): void {
  state.lastShotId = "";
  state.lastShotShooterVehicleId = "";
  state.lastShotShooterSessionId = "";
  state.lastShotOriginX = 0;
  state.lastShotOriginY = 0;
  state.lastShotAngle = 0;
  state.lastShotPower = 0;
  state.lastShotFacing = 1;
  state.lastShotWind = 0;
  state.lastShotImpactX = 0;
  state.lastShotImpactY = 0;
  state.lastShotDirectHitVehicleId = "";
  state.lastShotTargetVehicleId = "";
  state.lastShotDamage = 0;
  state.lastShotTargetHpBefore = 0;
  state.lastShotTargetHpAfter = 0;
  state.lastShotTurnNumber = 0;
  state.lastShotTurnAuthorityVersion = 0;
  state.lastShotServerTimeMs = 0;
}

function clampAngleForFacing(angle: number, facing: 1 | -1): number {
  return facing === 1
    ? clamp(angle, MIN_ELEVATION_DEG, MAX_ELEVATION_DEG)
    : clamp(angle, 180 - MAX_ELEVATION_DEG, 180 - MIN_ELEVATION_DEG);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mapSeedForRound(roundNumber: number): number {
  return Math.max(1, roundNumber);
}

function targetScoreForMatchLength(matchLength: MatchLength): number {
  return matchLength === "best-of-3" ? 2 : 1;
}

function replaceTurnSequence(state: GravityCanyonState, turnSequence: VehicleId[]): void {
  state.turnSequence.splice(0, state.turnSequence.length);
  for (const vehicleId of turnSequence) {
    state.turnSequence.push(vehicleId);
  }
}

function fallbackSpawnForSlot(slotId: VehicleId): SpawnPoint {
  const fallbackMap = pickMap("ring-basin", 1);
  return fallbackMap.spawns[slotId];
}

function initialAngleForFacing(facing: V1Map["spawns"][VehicleId]["facing"]): number {
  return facing === 1 ? 47 : 133;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
