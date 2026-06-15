import type { TeamId } from "../../shared/model/gameTypes.js";
import type { PlayableTerrain } from "../playableMaps";
import type { MatchViewState } from "./MatchView";
import type { ImpactPreview, ProjectileState, VehicleState } from "./MatchTypes";

export interface BuildMatchViewStateInput {
  vehicles: readonly VehicleState[];
  activeVehicle?: VehicleState;
  projectile?: ProjectileState;
  impactPreview?: ImpactPreview;
  currentMap?: PlayableTerrain;
  visibleVoidTopY: number;
  visibleVoidBottomY: number;
  terrainPlatformBottomY: number;
  terrainBreakthroughY: number;
  showCombatHulls: boolean;
  roundOver: boolean;
  turnCommitted: boolean;
  charging: boolean;
  charge: number;
  turnTime: number;
  cameraZoom: number;
  shotResult: string;
  aliveTeamCount: number;
  winningTeam?: TeamId;
  wind: number;
}

export class MatchViewStateBuilder {
  build(input: BuildMatchViewStateInput): MatchViewState {
    return {
      vehicles: input.vehicles,
      activeVehicle: input.activeVehicle,
      projectile: input.projectile,
      impactPreview: input.impactPreview,
      currentMap: input.currentMap,
      visibleVoidTopY: input.visibleVoidTopY,
      visibleVoidBottomY: input.visibleVoidBottomY,
      terrainPlatformBottomY: input.terrainPlatformBottomY,
      terrainBreakthroughY: input.terrainBreakthroughY,
      showCombatHulls: input.showCombatHulls,
      roundOver: input.roundOver,
      turnCommitted: input.turnCommitted,
      charging: input.charging,
      charge: input.charge,
      turnTime: input.turnTime,
      cameraZoom: input.cameraZoom,
      shotResult: input.shotResult,
      roundComplete: input.roundOver || input.aliveTeamCount <= 1 || Boolean(input.winningTeam),
      windLabel: this.windLabel(input.wind),
    };
  }

  private windLabel(wind: number): string {
    if (Math.abs(wind) < 0.12) {
      return "calm";
    }

    const direction = wind > 0 ? ">>" : "<<";
    return `${direction} ${Math.round(Math.abs(wind) * 10)}`;
  }
}
