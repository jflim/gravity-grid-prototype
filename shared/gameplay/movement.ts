import type { Facing } from "../model/gameTypes.js";

export type MovementDirection = -1 | 0 | 1;

export interface AimAngleInput {
  angle: number;
  facing: Facing;
  aimUp: boolean;
  aimDown: boolean;
  deltaSeconds: number;
  angleSpeedDegPerSecond: number;
  minElevationDeg: number;
  maxElevationDeg: number;
}

export interface FacingChangeInput {
  currentAngle: number;
  currentFacing: Facing;
  nextFacing: Facing;
  minElevationDeg: number;
  maxElevationDeg: number;
}

export interface MovementStepInput {
  x: number;
  moveUnits: number;
  direction: MovementDirection;
  deltaSeconds: number;
  moveSpeedPixelsPerSecond: number;
  movePixelsPerUnit: number;
  minX: number;
  maxX: number;
  maxClimbSlope: number;
  surfaceAt: (x: number) => number;
}

export interface MovementStepResult {
  x: number;
  moveUnits: number;
  moved: boolean;
}

export interface ChargeStateInput {
  isCharging: boolean;
  charge: number;
  chargeHeld: boolean;
  deltaSeconds: number;
  chargeRatePerSecond: number;
  maxPower: number;
  minFirePower: number;
}

export interface ChargeStateResult {
  isCharging: boolean;
  charge: number;
  firePower?: number;
}

export function aimAngleAfterInput(input: AimAngleInput): number {
  let angle = input.angle;
  const amount = input.angleSpeedDegPerSecond * input.deltaSeconds;

  if (input.aimUp) {
    angle += input.facing === 1 ? amount : -amount;
  }

  if (input.aimDown) {
    angle += input.facing === 1 ? -amount : amount;
  }

  return clampAimAngleForFacing(angle, input.facing, input.minElevationDeg, input.maxElevationDeg);
}

export function aimAngleForFacingChange(input: FacingChangeInput): number {
  if (input.currentFacing === input.nextFacing) {
    return clampAimAngleForFacing(
      input.currentAngle,
      input.currentFacing,
      input.minElevationDeg,
      input.maxElevationDeg,
    );
  }

  const currentElevation =
    input.currentFacing === 1 ? input.currentAngle : 180 - input.currentAngle;
  const clampedElevation = clamp(currentElevation, input.minElevationDeg, input.maxElevationDeg);
  return input.nextFacing === 1 ? clampedElevation : 180 - clampedElevation;
}

export function movementDirectionFromInput(moveLeft: boolean, moveRight: boolean): MovementDirection {
  if (moveLeft === moveRight) {
    return 0;
  }

  return moveLeft ? -1 : 1;
}

export function resolveMovementStep(input: MovementStepInput): MovementStepResult {
  if (input.direction === 0 || input.moveUnits <= 0) {
    return { x: input.x, moveUnits: input.moveUnits, moved: false };
  }

  const maxStepDistance = input.moveUnits * input.movePixelsPerUnit;
  const stepDistance = Math.min(input.moveSpeedPixelsPerSecond * input.deltaSeconds, maxStepDistance);
  const proposedX = clamp(input.x + input.direction * stepDistance, input.minX, input.maxX);
  const oldSurface = input.surfaceAt(input.x);
  const newSurface = input.surfaceAt(proposedX);
  const distanceMoved = Math.abs(proposedX - input.x);
  const surfaceDelta = newSurface - oldSurface;
  const uphillSlope = Math.max(0, -surfaceDelta) / Math.max(distanceMoved, 1);
  const canTraverse = surfaceDelta >= 0 || uphillSlope <= input.maxClimbSlope;

  if (!canTraverse || distanceMoved <= 0) {
    return { x: input.x, moveUnits: input.moveUnits, moved: false };
  }

  return {
    x: proposedX,
    moveUnits: Math.max(0, input.moveUnits - distanceMoved / input.movePixelsPerUnit),
    moved: true,
  };
}

export function updateChargeState(input: ChargeStateInput): ChargeStateResult {
  if (input.chargeHeld) {
    return {
      isCharging: true,
      charge: Math.min(input.maxPower, input.charge + input.deltaSeconds * input.chargeRatePerSecond),
    };
  }

  if (input.isCharging) {
    return {
      isCharging: false,
      charge: 0,
      firePower: Math.max(input.minFirePower, input.charge),
    };
  }

  return {
    isCharging: false,
    charge: input.charge,
  };
}

function clampAimAngleForFacing(
  angle: number,
  facing: Facing,
  minElevationDeg: number,
  maxElevationDeg: number,
): number {
  return facing === 1
    ? clamp(angle, minElevationDeg, maxElevationDeg)
    : clamp(angle, 180 - maxElevationDeg, 180 - minElevationDeg);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
