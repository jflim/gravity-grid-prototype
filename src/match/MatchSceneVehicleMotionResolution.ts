import type { TeamId } from "../../shared/model/gameTypes.js";
import type { MatchSoundController } from "./audio/MatchSoundController";
import type { VehicleState } from "./MatchTypes";
import type { VehicleSettlementController } from "./VehicleSettlementController";
import { updateVehicleMotionsForScene } from "./MatchSceneVehicleMotionFlow";

export interface VehicleMotionResolutionInput {
  vehicles: VehicleState[];
  deltaSeconds: number;
  waitingForVehicleMotionResolution: boolean;
  vehicleSettlementController: VehicleSettlementController;
  soundController: MatchSoundController;
  addVoidDropMarker: (vehicle: VehicleState) => void;
  frameBattlefield: (duration?: number) => void;
  drawWorld: () => void;
  winningTeam: () => TeamId | undefined;
  endRound: () => void;
  advanceTurn: () => void;
  queueRoundEvent: (delayMs: number, action: () => void) => void;
}

export interface VehicleMotionResolutionResult {
  handled: boolean;
  waitingForVehicleMotionResolution: boolean;
  resultText?: string;
}

export function resolveVehicleMotionForScene(
  input: VehicleMotionResolutionInput,
): VehicleMotionResolutionResult {
  const motionEvents = updateVehicleMotionsForScene({
    vehicles: input.vehicles,
    deltaSeconds: input.deltaSeconds,
    vehicleSettlementController: input.vehicleSettlementController,
    addVoidDropMarker: input.addVoidDropMarker,
    playVoidDrop: () => input.soundController.playVoidDrop(),
  });
  const resultText = motionEventsText(motionEvents);

  if (input.vehicleSettlementController.hasActiveVehicleMotion(input.vehicles)) {
    input.frameBattlefield(0);
    input.drawWorld();
    return { handled: true, waitingForVehicleMotionResolution: true, resultText };
  }

  if (input.waitingForVehicleMotionResolution) {
    queuePostMotionResolution(input);
    input.drawWorld();
    return { handled: true, waitingForVehicleMotionResolution: false, resultText };
  }

  if (motionEvents.length > 0) {
    queuePostMotionResolution(input);
    input.drawWorld();
    return { handled: true, waitingForVehicleMotionResolution: false, resultText };
  }

  return {
    handled: false,
    waitingForVehicleMotionResolution: input.waitingForVehicleMotionResolution,
    resultText,
  };
}

function queuePostMotionResolution(input: VehicleMotionResolutionInput): void {
  const action = input.winningTeam() ? () => input.endRound() : () => input.advanceTurn();
  input.queueRoundEvent(900, action);
}

function motionEventsText(motionEvents: readonly string[]): string | undefined {
  return motionEvents.length > 0 ? motionEvents.join(" / ") : undefined;
}
