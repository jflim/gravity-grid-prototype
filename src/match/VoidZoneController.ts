import type { SpriteDisplaySize } from "../combatPresentation";
import {
  chooseVoidDropDisplayX,
  visibleVoidZoneBottomY,
  voidDropTargetY,
} from "../voidDropPresentation";
import type { VehicleState, VoidDropPresentationState } from "./MatchTypes";

export interface VoidZoneControllerOptions {
  worldWidth: number;
  terrainStep: number;
  displaySize: SpriteDisplaySize;
  visibleVoidZoneHeight: number;
  horizontalPadding: number;
  fallDurationSeconds: number;
  terrainBreakthroughPadding?: number;
}

export interface CreateVoidDropPresentationInput {
  fallStartX: number;
  fallStartY: number;
  visibleVoidTopY: number;
  terrainBreakthroughY: number;
  surfaceAt: (x: number) => number;
}

export class VoidZoneController {
  private readonly terrainBreakthroughPadding: number;

  constructor(private readonly options: VoidZoneControllerOptions) {
    this.terrainBreakthroughPadding = options.terrainBreakthroughPadding ?? 8;
  }

  createVoidDropPresentation(input: CreateVoidDropPresentationInput): VoidDropPresentationState {
    const targetX = chooseVoidDropDisplayX({
      startX: input.fallStartX,
      worldWidth: this.options.worldWidth,
      step: this.options.terrainStep,
      displayWidth: this.options.displaySize.width,
      padding: this.options.horizontalPadding,
      isVoidAt: (x) => input.surfaceAt(x) >= input.terrainBreakthroughY,
    });
    const targetY = this.voidDropTargetY(input.visibleVoidTopY);

    return {
      fromX: input.fallStartX,
      fromY: input.fallStartY,
      targetX,
      targetY,
      age: 0,
      duration: this.options.fallDurationSeconds,
    };
  }

  updatePresentations(vehicles: VehicleState[], dt: number): void {
    for (const vehicle of vehicles) {
      if (vehicle.voidDropPresentation) {
        vehicle.voidDropPresentation.age = Math.min(
          vehicle.voidDropPresentation.duration,
          vehicle.voidDropPresentation.age + dt,
        );
      }
    }
  }

  terrainBreakthroughY(visibleVoidTopY: number): number {
    return visibleVoidTopY + this.terrainBreakthroughPadding;
  }

  terrainPlatformBottomY(visibleVoidTopY: number): number {
    return visibleVoidTopY;
  }

  visibleVoidBottomY(visibleVoidTopY: number): number {
    return visibleVoidZoneBottomY(visibleVoidTopY, this.options.visibleVoidZoneHeight);
  }

  voidDropTargetY(visibleVoidTopY: number): number {
    return voidDropTargetY({
      visibleVoidTopY,
      visibleVoidZoneHeight: this.options.visibleVoidZoneHeight,
      displayHeight: this.options.displaySize.height,
    });
  }
}
