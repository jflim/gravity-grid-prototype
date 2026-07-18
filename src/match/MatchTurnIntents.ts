import { movementDirectionFromInput, type MovementDirection } from "../../shared/gameplay/movement.js";
import type { MatchInputSnapshot } from "./MatchInputController";
import type { VehicleState } from "./MatchTypes";

export type MatchMoveIntent = {
  vehicle: VehicleState;
  input: MatchInputSnapshot;
  deltaSeconds: number;
};

export type MatchAimIntent = {
  vehicle: VehicleState;
};

export type MatchFireIntent = {
  vehicle: VehicleState;
  power: number;
};

export type MatchTurnIntentPublisher = {
  canControlVehicle: (vehicleId: string) => boolean;
  submitAim: (intent: MatchAimIntent) => void;
  submitMove: (intent: MatchMoveIntent) => void;
  submitFire: (intent: MatchFireIntent) => void;
};

export function inputForTurnAuthority(
  input: MatchInputSnapshot,
  activeVehicle: VehicleState,
  publisher: MatchTurnIntentPublisher | undefined,
): MatchInputSnapshot {
  if (canLocalPlayerControlTurn(activeVehicle.id, publisher)) {
    return input;
  }

  return {
    ...input,
    aimUp: false,
    aimDown: false,
    moveLeft: false,
    moveRight: false,
    chargeHeld: false,
  };
}

export function canLocalPlayerControlTurn(
  vehicleId: string,
  publisher: MatchTurnIntentPublisher | undefined,
): boolean {
  return !publisher || publisher.canControlVehicle(vehicleId);
}

export function movementDirectionForIntent(input: MatchInputSnapshot): MovementDirection {
  return movementDirectionFromInput(input.moveLeft, input.moveRight);
}
