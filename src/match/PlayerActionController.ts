import {
  aimAngleAfterInput,
  aimAngleForFacingChange,
  movementDirectionFromInput,
  resolveMovementStep,
  updateChargeState,
} from "../../shared/gameplay/movement.js";
import type { MatchInputSnapshot } from "./MatchInputController";
import type { VehicleState } from "./MatchTypes";

export interface PlayerActionChargeState {
  isCharging: boolean;
  charge: number;
}

export interface PlayerActionControllerOptions {
  aimSpeedDegPerSecond: number;
  minElevationDeg: number;
  maxElevationDeg: number;
  moveSpeedPixelsPerSecond: number;
  movePixelsPerUnit: number;
  minX: number;
  maxX: number;
  maxClimbSlope: number;
  fallSurfaceY: number;
  chargeRatePerSecond: number;
  maxPower: number;
  minFirePower: number;
  surfaceAt: (x: number) => number;
  placeVehicleOnSurface: (vehicle: VehicleState) => void;
  chargeState: () => PlayerActionChargeState;
  setChargeState: (state: PlayerActionChargeState) => void;
  fire: (vehicle: VehicleState, power: number) => void;
  resetCharge: () => void;
  onVehicleMoved: (vehicle: VehicleState) => void;
  onVehicleDroveIntoVoid: (vehicle: VehicleState) => void;
}

export class PlayerActionController {
  constructor(private readonly options: PlayerActionControllerOptions) {}

  handleVehicleInput(active: VehicleState, input: MatchInputSnapshot, deltaSeconds: number): void {
    active.angle = aimAngleAfterInput({
      angle: active.angle,
      facing: active.facing,
      aimUp: input.aimUp,
      aimDown: input.aimDown,
      deltaSeconds,
      angleSpeedDegPerSecond: this.options.aimSpeedDegPerSecond,
      minElevationDeg: this.options.minElevationDeg,
      maxElevationDeg: this.options.maxElevationDeg,
    });

    const moveDirection = movementDirectionFromInput(input.moveLeft, input.moveRight);
    if (moveDirection !== 0) {
      this.setVehicleFacing(active, moveDirection);
    }

    if (active.moveUnits <= 0 || moveDirection === 0) {
      return;
    }

    const step = resolveMovementStep({
      x: active.x,
      moveUnits: active.moveUnits,
      direction: moveDirection,
      deltaSeconds,
      moveSpeedPixelsPerSecond: this.options.moveSpeedPixelsPerSecond,
      movePixelsPerUnit: this.options.movePixelsPerUnit,
      minX: this.options.minX,
      maxX: this.options.maxX,
      maxClimbSlope: this.options.maxClimbSlope,
      fallSurfaceY: this.options.fallSurfaceY,
      surfaceAt: this.options.surfaceAt,
    });

    if (!step.moved) {
      return;
    }

    active.x = step.x;
    this.options.placeVehicleOnSurface(active);
    active.moveUnits = step.moveUnits;

    if (!active.alive) {
      this.options.onVehicleDroveIntoVoid(active);
      this.options.resetCharge();
    }

    this.options.onVehicleMoved(active);
  }

  handleChargeInput(active: VehicleState, input: MatchInputSnapshot, deltaSeconds: number): void {
    const current = this.options.chargeState();
    const charge = updateChargeState({
      isCharging: current.isCharging,
      charge: current.charge,
      chargeHeld: input.chargeHeld,
      deltaSeconds,
      chargeRatePerSecond: this.options.chargeRatePerSecond,
      maxPower: this.options.maxPower,
      minFirePower: this.options.minFirePower,
    });

    this.options.setChargeState({
      isCharging: charge.isCharging,
      charge: charge.charge,
    });

    if (charge.firePower !== undefined) {
      this.options.fire(active, charge.firePower);
    }
  }

  private setVehicleFacing(vehicle: VehicleState, facing: 1 | -1): void {
    if (vehicle.facing === facing) {
      return;
    }

    const nextAngle = aimAngleForFacingChange({
      currentAngle: vehicle.angle,
      currentFacing: vehicle.facing,
      nextFacing: facing,
      minElevationDeg: this.options.minElevationDeg,
      maxElevationDeg: this.options.maxElevationDeg,
    });
    vehicle.facing = facing;
    vehicle.angle = nextAngle;
  }
}
