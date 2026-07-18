import type { TeamId } from "../../shared/model/gameTypes.js";
import type { MatchViewBaseState, MatchViewState } from "./MatchView";

export interface BuildMatchViewStateInput extends MatchViewBaseState {
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
      localActiveTurn: input.localActiveTurn,
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
