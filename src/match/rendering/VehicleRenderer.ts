import Phaser from "phaser";
import {
  computeUnitWorldOverlayLayout,
  readableWorldUiScale,
} from "../../demoLayout";
import type { VehicleState } from "../MatchTypes";
import { type VehicleOverlayDrawKey, vehicleOverlayDrawKeysFor } from "./VehicleOverlayDrawPlan";
import { VehicleOverlayRenderer } from "./VehicleOverlayRenderer";
import { vehicleRenderModelFor } from "./VehicleRenderModel";
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
  localActiveTurn: boolean;
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
      const model = vehicleRenderModelFor({
        vehicle,
        activeVehicleId: input.activeVehicle?.id,
        projectileActive: input.projectileActive,
        roundOver: input.roundOver,
        turnCommitted: input.turnCommitted,
        localActiveTurn: input.localActiveTurn,
        charging: input.charging,
        turnTime: input.turnTime,
        showCombatHulls: input.showCombatHulls,
        surfaceAt: this.options.surfaceAt,
        isMovable: input.isMovable,
      });

      this.overlays.drawFootingMarker(vehicle, model.active);
      this.sprites.draw({
        vehicle,
        active: model.active,
        charging: model.charging,
        renderX: model.renderX,
        renderY: model.renderY,
        alpha: model.alpha,
        slopeAngle: model.slopeAngle,
        koTilt: model.koTilt,
        tint: model.tint,
      });

      const overlayDrawers: Record<VehicleOverlayDrawKey, () => void> = {
        combatHull: () => this.overlays.drawCombatHull(vehicle, model.active, model.slopeAngle),
        hpBar: () => this.overlays.drawHpBar(vehicle, model.renderX, model.renderY, overlayLayout, worldUiScale),
      };

      for (const drawKey of vehicleOverlayDrawKeysFor(model)) {
        overlayDrawers[drawKey]();
      }

      this.overlays.drawLabels(
        vehicle,
        model.renderX,
        model.renderY,
        overlayLayout,
        worldUiScale,
        model.motionOrDefeatLabel,
        model.active,
        model.localActiveTurn,
        model.turnTime,
      );
    }
  }
}
