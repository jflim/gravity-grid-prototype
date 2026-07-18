import type { TeamId } from "../model/gameTypes.js";
import { isRoundVehicleAlive, resolveRoundOutcome, type RoundVehicle } from "./rounds.js";

export interface TurnOrderVehicle extends RoundVehicle {}

export interface ResolveNextTurnInput {
  turnOrder: readonly string[];
  currentTurnIndex: number;
  vehicles: readonly TurnOrderVehicle[];
}

export type TurnAdvanceDecision =
  | {
      kind: "next-turn";
      nextTurnIndex: number;
      activeVehicleId: string;
    }
  | {
      kind: "round-over";
      winnerTeam?: TeamId;
    };

export function resolveNextTurn(input: ResolveNextTurnInput): TurnAdvanceDecision {
  const roundOutcome = resolveRoundOutcome(input.vehicles);
  if (roundOutcome.kind === "round-over") {
    return roundOutcome;
  }

  const vehicleById = new Map(input.vehicles.map((vehicle) => [vehicle.id, vehicle]));
  for (let i = 0; i < input.turnOrder.length; i += 1) {
    const nextTurnIndex = positiveModulo(input.currentTurnIndex + i + 1, input.turnOrder.length);
    const activeVehicleId = input.turnOrder[nextTurnIndex];
    const vehicle = vehicleById.get(activeVehicleId);
    if (vehicle && isRoundVehicleAlive(vehicle)) {
      return {
        kind: "next-turn",
        nextTurnIndex,
        activeVehicleId,
      };
    }
  }

  return {
    kind: "round-over",
    winnerTeam: undefined,
  };
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
