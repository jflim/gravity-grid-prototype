import { defeatPresentationFor, type DefeatPresentation } from "../../combatPresentation";
import { voidDropRenderPosition } from "../../voidDropPresentation";
import type { VehicleState, WorldPoint } from "../MatchTypes";

export interface VehicleRenderModelInput {
  vehicle: VehicleState;
  activeVehicleId?: string;
  projectileActive: boolean;
  roundOver: boolean;
  turnCommitted: boolean;
  localActiveTurn: boolean;
  charging: boolean;
  turnTime: number;
  showCombatHulls: boolean;
  surfaceAt: (x: number) => number;
  isMovable: (vehicle: VehicleState) => boolean;
}

export interface VehicleRenderModel {
  active: boolean;
  localActiveTurn: boolean;
  charging: boolean;
  renderX: number;
  renderY: number;
  alpha: number;
  slopeAngle: number;
  koTilt: number;
  tint?: number;
  motionOrDefeatLabel?: string;
  showCombatHull: boolean;
  showHpBar: boolean;
  turnTime: number;
}

export function vehicleRenderModelFor(input: VehicleRenderModelInput): VehicleRenderModel {
  const { vehicle } = input;
  const active = isActiveVehicle(input);
  const defeatPresentation = defeatPresentationForVehicle(vehicle);
  const voidDropPosition = voidDropPositionFor(vehicle, defeatPresentation);

  return {
    active,
    localActiveTurn: localActiveTurnFor(active, input.localActiveTurn),
    charging: input.charging,
    renderX: renderXFor(vehicle, voidDropPosition),
    renderY: renderYFor(vehicle, voidDropPosition, defeatPresentation),
    alpha: alphaFor(vehicle, defeatPresentation),
    slopeAngle: slopeAngleFor(vehicle, input.surfaceAt),
    koTilt: koTiltFor(vehicle),
    tint: tintFor(defeatPresentation),
    motionOrDefeatLabel: motionLabelFor(vehicle) ?? defeatPresentation?.label,
    showCombatHull: input.showCombatHulls && vehicle.alive,
    showHpBar: showHpBarFor(vehicle),
    turnTime: input.turnTime,
  };
}

function defeatPresentationForVehicle(vehicle: VehicleState): DefeatPresentation | undefined {
  if (vehicle.alive) {
    return undefined;
  }

  return defeatPresentationFor(vehicle.defeatReason);
}

function voidDropPositionFor(
  vehicle: VehicleState,
  defeatPresentation: DefeatPresentation | undefined,
): WorldPoint | undefined {
  if (!vehicle.voidDropPresentation) {
    return undefined;
  }

  if (defeatPresentation?.label !== "VOID DROPPED") {
    return undefined;
  }

  return voidDropRenderPosition(vehicle.voidDropPresentation);
}

function renderXFor(vehicle: VehicleState, voidDropPosition: WorldPoint | undefined): number {
  if (voidDropPosition) {
    return voidDropPosition.x;
  }

  return vehicle.x;
}

function renderYFor(
  vehicle: VehicleState,
  voidDropPosition: WorldPoint | undefined,
  defeatPresentation: DefeatPresentation | undefined,
): number {
  if (voidDropPosition) {
    return voidDropPosition.y;
  }

  if (defeatPresentation?.y !== undefined) {
    return defeatPresentation.y;
  }

  return vehicle.y;
}

function alphaFor(vehicle: VehicleState, defeatPresentation: DefeatPresentation | undefined): number {
  if (vehicle.alive) {
    return 1;
  }

  if (!defeatPresentation) {
    return 0.9;
  }

  return defeatPresentation.alpha;
}

function isActiveVehicle(input: VehicleRenderModelInput): boolean {
  if (isTurnLocked(input)) {
    return false;
  }

  return (
    input.activeVehicleId === input.vehicle.id &&
    input.isMovable(input.vehicle)
  );
}

function isTurnLocked(input: VehicleRenderModelInput): boolean {
  return input.projectileActive || input.roundOver || input.turnCommitted;
}

function localActiveTurnFor(active: boolean, localActiveTurn: boolean): boolean {
  return active && localActiveTurn;
}

function motionLabelFor(vehicle: VehicleState): string | undefined {
  const kind = vehicle.motion?.kind;

  if (!kind) {
    return undefined;
  }

  return {
    falling: "FALLING",
    sliding: "SLIDING",
  }[kind];
}

function shouldStayLevel(vehicle: VehicleState): boolean {
  return vehicle.defeatReason === "void" || vehicle.motion?.kind === "falling";
}

function slopeAngleFor(vehicle: VehicleState, surfaceAt: (x: number) => number): number {
  if (shouldStayLevel(vehicle)) {
    return 0;
  }

  return terrainAngleAt(surfaceAt, vehicle.x);
}

function koTiltFor(vehicle: VehicleState): number {
  if (vehicle.alive) {
    return 0;
  }

  return vehicle.team === "red" ? -8 : 8;
}

function tintFor(defeatPresentation: DefeatPresentation | undefined): number | undefined {
  return defeatPresentation?.tint;
}

function showHpBarFor(vehicle: VehicleState): boolean {
  return vehicle.alive || vehicle.defeatReason === "damage";
}

function terrainAngleAt(surfaceAt: (x: number) => number, x: number): number {
  const sampleDistance = 22;
  const left = surfaceAt(x - sampleDistance);
  const right = surfaceAt(x + sampleDistance);
  return (Math.atan2(right - left, sampleDistance * 2) * 180) / Math.PI;
}
