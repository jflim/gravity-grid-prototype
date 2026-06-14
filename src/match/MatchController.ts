import type { TeamId } from "../../shared/model/gameTypes.js";
import {
  aliveTeamsForRound,
  isRoundVehicleAlive,
  winningTeamForRound,
  type RoundVehicle,
} from "../../shared/match/rounds.js";
import { resolveNextTurn, type ResolveNextTurnInput, type TurnAdvanceDecision } from "../../shared/match/turns.js";

export interface MatchControllerVehicle extends RoundVehicle {
  id: string;
}

export class MatchController {
  activeVehicle<T extends MatchControllerVehicle>(
    vehicles: readonly T[],
    turnOrder: readonly string[],
    turnIndex: number,
  ): T | undefined {
    const activeId = turnOrder[turnIndex];
    return vehicles.find((vehicle) => vehicle.id === activeId);
  }

  isAlive(vehicle: Pick<MatchControllerVehicle, "hp" | "alive">): boolean {
    return isRoundVehicleAlive(vehicle);
  }

  isMovable(vehicle: MatchControllerVehicle, turnOrder: readonly string[]): boolean {
    return this.isAlive(vehicle) && turnOrder.includes(vehicle.id);
  }

  aliveTeams(vehicles: readonly MatchControllerVehicle[]): Set<TeamId> {
    return aliveTeamsForRound(vehicles);
  }

  winningTeam(vehicles: readonly MatchControllerVehicle[]): TeamId | undefined {
    return winningTeamForRound(vehicles);
  }

  resolveNextTurn(input: ResolveNextTurnInput): TurnAdvanceDecision {
    return resolveNextTurn(input);
  }
}
