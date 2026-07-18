import type { MatchInputSnapshot } from "./MatchInputController";
import type { VehicleState } from "./MatchTypes";

export function vehicleInputPublishFlags(
  input: MatchInputSnapshot,
  vehicle: VehicleState,
  previousAngle: number,
  previousFacing: VehicleState["facing"],
  moved: boolean,
): { aim: boolean; move: boolean } {
  return {
    aim: (input.aimUp || input.aimDown) && vehicle.angle !== previousAngle,
    move: moved || vehicle.facing !== previousFacing,
  };
}
