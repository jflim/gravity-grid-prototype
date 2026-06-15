import Phaser from "phaser";
import { defeatPresentationFor } from "../../combatPresentation";
import {
  computeUnitWorldOverlayLayout,
  readableWorldUiScale,
} from "../../demoLayout";
import { voidDropRenderPosition } from "../../voidDropPresentation";
import type { VehicleState } from "../MatchTypes";
import { VehicleOverlayRenderer } from "./VehicleOverlayRenderer";
import { VehicleSpriteLayer } from "./VehicleSpriteLayer";

export interface VehicleRendererOptions {
  scene: Phaser.Scene;
  gfx: Phaser.GameObjects.Graphics;
  collisionGfx: Phaser.GameObjects.Graphics;
  useUnitConceptPreview: boolean;
  surfaceAt: (x: number) => number;
}

export interface DrawVehiclesInput {
  vehicles: readonly VehicleState[];
  activeVehicle?: VehicleState;
  projectileActive: boolean;
  roundOver: boolean;
  turnCommitted: boolean;
  showCombatHulls: boolean;
  charging: boolean;
  turnTime: number;
  cameraZoom: number;
  isMovable: (vehicle: VehicleState) => boolean;
}

export class VehicleRenderer {
  private readonly overlays: VehicleOverlayRenderer;
  private readonly sprites: VehicleSpriteLayer;

  constructor(private readonly options: VehicleRendererOptions) {
    this.overlays = new VehicleOverlayRenderer({
      scene: options.scene,
      gfx: options.gfx,
      collisionGfx: options.collisionGfx,
      surfaceAt: options.surfaceAt,
    });
    this.sprites = new VehicleSpriteLayer({
      scene: options.scene,
      useUnitConceptPreview: options.useUnitConceptPreview,
    });
  }

  draw(input: DrawVehiclesInput): void {
    const worldUiScale = readableWorldUiScale(input.cameraZoom);
    const overlayLayout = computeUnitWorldOverlayLayout({
      useUnitConceptPreview: this.options.useUnitConceptPreview,
      worldUiScale,
    });
    this.overlays.clear();

    for (const vehicle of input.vehicles) {
      const defeatPresentation = vehicle.alive ? undefined : defeatPresentationFor(vehicle.defeatReason);
      const alpha = vehicle.alive ? 1 : defeatPresentation?.alpha ?? 0.9;
      const voidDropPosition =
        vehicle.voidDropPresentation && defeatPresentation?.label === "VOID DROPPED"
          ? voidDropRenderPosition(vehicle.voidDropPresentation)
          : undefined;
      const renderX = voidDropPosition?.x ?? vehicle.x;
      const renderY = voidDropPosition?.y ?? defeatPresentation?.y ?? vehicle.y;
      const active =
        input.activeVehicle?.id === vehicle.id &&
        !input.projectileActive &&
        !input.roundOver &&
        !input.turnCommitted &&
        input.isMovable(vehicle);
      const slopeAngle = vehicle.defeatReason === "void" ? 0 : this.terrainAngleAt(vehicle.x);
      const koTilt = vehicle.alive ? 0 : vehicle.team === "red" ? -8 : 8;

      this.overlays.drawFootingMarker(vehicle, active);
      this.sprites.draw({
        vehicle,
        active,
        charging: input.charging,
        renderX,
        renderY,
        alpha,
        slopeAngle,
        koTilt,
        tint: defeatPresentation?.tint,
      });

      if (input.showCombatHulls && vehicle.alive) {
        this.overlays.drawCombatHull(vehicle, active);
      }

      if (vehicle.alive || vehicle.defeatReason === "damage") {
        this.overlays.drawHpBar(vehicle, renderX, renderY, overlayLayout, worldUiScale);
      }

      this.overlays.drawLabels(
        vehicle,
        renderX,
        renderY,
        overlayLayout,
        worldUiScale,
        defeatPresentation?.label,
        active,
        input.turnTime,
      );
    }
  }

  private terrainAngleAt(x: number): number {
    const sampleDistance = 22;
    const left = this.options.surfaceAt(x - sampleDistance);
    const right = this.options.surfaceAt(x + sampleDistance);
    return Phaser.Math.RadToDeg(Math.atan2(right - left, sampleDistance * 2));
  }
}
