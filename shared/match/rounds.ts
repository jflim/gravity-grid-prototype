import type { TeamId } from "../model/gameTypes.js";

export interface RoundVehicle {
  id: string;
  team: TeamId;
  hp: number;
  alive: boolean;
}

export type RoundOutcome =
  | {
      kind: "round-active";
      aliveTeams: Set<TeamId>;
    }
  | {
      kind: "round-over";
      winnerTeam?: TeamId;
    };

export function isRoundVehicleAlive(vehicle: Pick<RoundVehicle, "hp" | "alive">): boolean {
  return vehicle.alive && vehicle.hp > 0;
}

export function aliveTeamsForRound(vehicles: readonly RoundVehicle[]): Set<TeamId> {
  return new Set(vehicles.filter(isRoundVehicleAlive).map((vehicle) => vehicle.team));
}

export function winningTeamForRound(vehicles: readonly RoundVehicle[]): TeamId | undefined {
  const aliveTeams = aliveTeamsForRound(vehicles);
  return aliveTeams.size === 1 ? [...aliveTeams][0] : undefined;
}

export function resolveRoundOutcome(vehicles: readonly RoundVehicle[]): RoundOutcome {
  const aliveTeams = aliveTeamsForRound(vehicles);
  if (aliveTeams.size <= 1) {
    return {
      kind: "round-over",
      winnerTeam: winningTeamForRound(vehicles),
    };
  }

  return {
    kind: "round-active",
    aliveTeams,
  };
}
