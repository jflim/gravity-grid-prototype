import Phaser from "phaser";
import { MAX_HP, VEHICLE_HALF_WIDTH } from "../../../shared/v1/tuning.js";
import { collisionZoneOverlayStyle } from "../../collisionOverlay";
import { computeUnitWorldOverlayLayout } from "../../demoLayout";
import type { VehicleState } from "../MatchTypes";
import { VehicleGeometry } from "../VehicleGeometry";

export interface VehicleOverlayRendererOptions {
  scene: Phaser.Scene;
  gfx: Phaser.GameObjects.Graphics;
  collisionGfx: Phaser.GameObjects.Graphics;
  surfaceAt: (x: number) => number;
}

export class VehicleOverlayRenderer {
  private readonly vehicleGeometry = new VehicleGeometry();
  private vehicleLabels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly options: VehicleOverlayRendererOptions) {}

  clear(): void {
    this.options.gfx.clear();
    this.options.collisionGfx.clear();

    for (const label of this.vehicleLabels) {
      label.destroy();
    }
    this.vehicleLabels = [];
  }

  drawFootingMarker(vehicle: VehicleState, active: boolean): void {
    if (!active || !vehicle.alive) {
      return;
    }

    const surface = this.options.surfaceAt(vehicle.x);
    const leftX = vehicle.x - VEHICLE_HALF_WIDTH;
    const rightX = vehicle.x + VEHICLE_HALF_WIDTH;
    this.options.gfx.lineStyle(8, 0x020613, 0.62);
    this.options.gfx.lineBetween(leftX, surface - 2, rightX, surface - 2);
    this.options.gfx.lineStyle(3, vehicle.accent, 0.86);
    this.options.gfx.lineBetween(leftX, surface - 4, rightX, surface - 4);
  }

  drawCombatHull(vehicle: VehicleState, active: boolean): void {
    const hull = this.vehicleGeometry.combatHullFor(vehicle);
    const hullCenter = this.vehicleGeometry.combatHullCenter(vehicle);
    const hullColor = active ? 0xffffff : vehicle.accent;
    const overlay = collisionZoneOverlayStyle(active, hullColor);
    const left = hullCenter.x - hull.width / 2;
    const top = hullCenter.y - hull.height / 2;
    this.options.collisionGfx.fillStyle(overlay.fillColor, overlay.fillAlpha);
    this.options.collisionGfx.fillRoundedRect(left, top, hull.width, hull.height, 8);
    this.options.collisionGfx.lineStyle(overlay.lineWidth, overlay.lineColor, overlay.lineAlpha);
    this.options.collisionGfx.strokeRoundedRect(left, top, hull.width, hull.height, 8);
    this.options.collisionGfx.lineStyle(overlay.crossWidth, overlay.crossColor, overlay.crossAlpha);
    this.options.collisionGfx.lineBetween(left + 8, hullCenter.y, left + hull.width - 8, hullCenter.y);
    this.options.collisionGfx.lineBetween(hullCenter.x, top + 8, hullCenter.x, top + hull.height - 8);
  }

  drawHpBar(
    vehicle: VehicleState,
    renderX: number,
    renderY: number,
    overlayLayout: ReturnType<typeof computeUnitWorldOverlayLayout>,
    worldUiScale: number,
  ): void {
    this.options.gfx.fillStyle(0x0f172a, 0.88);
    const hpY = renderY - overlayLayout.teamBarOffsetY;
    const hpWidth = overlayLayout.teamBarWidth;
    const hpHeight = overlayLayout.teamBarHeight;
    const hpRadius = Math.max(4, hpHeight / 2);
    this.options.gfx.fillRoundedRect(renderX - hpWidth / 2, hpY, hpWidth, hpHeight, hpRadius);
    this.options.gfx.fillStyle(vehicle.team === "red" ? 0xff4d5d : 0x4cc9f0, 0.92);
    this.options.gfx.fillRoundedRect(
      renderX - hpWidth / 2 + 2 * worldUiScale,
      hpY + 2 * worldUiScale,
      Math.max(0, (hpWidth - 4 * worldUiScale) * (vehicle.hp / MAX_HP)),
      Math.max(3, hpHeight - 4 * worldUiScale),
      hpRadius,
    );
  }

  drawLabels(
    vehicle: VehicleState,
    renderX: number,
    renderY: number,
    overlayLayout: ReturnType<typeof computeUnitWorldOverlayLayout>,
    worldUiScale: number,
    defeatLabel: string | undefined,
    active: boolean,
    turnTime: number,
  ): void {
    const labelY = renderY - overlayLayout.nameOffsetY;
    const label = this.options.scene.add
      .text(renderX, labelY, vehicle.username, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "700",
        color: "#ffffff",
        stroke: "#10131b",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScale(worldUiScale)
      .setDepth(16);
    this.vehicleLabels.push(label);

    const stateLabel = defeatLabel ?? vehicle.className;
    const classLabel = this.options.scene.add
      .text(renderX, renderY - overlayLayout.classOffsetY, stateLabel, {
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: "12px",
        color: vehicle.defeatReason === "void" ? "#8be9ff" : vehicle.team === "red" ? "#ffd166" : "#8be9ff",
        stroke: "#10131b",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScale(worldUiScale)
      .setDepth(16);
    this.vehicleLabels.push(classLabel);

    if (!active) {
      return;
    }

    const timerY = renderY - overlayLayout.timerOffsetY;
    const timerWidth = overlayLayout.timerBadgeWidth;
    const timerHeight = overlayLayout.timerBadgeHeight;
    const timerRadius = overlayLayout.timerBadgeRadius;
    this.options.gfx.fillStyle(0x0b1020, 0.88);
    this.options.gfx.fillRoundedRect(
      renderX - timerWidth / 2,
      timerY - timerHeight * 0.45,
      timerWidth,
      timerHeight,
      timerRadius,
    );
    this.options.gfx.lineStyle(2, vehicle.accent, 0.72);
    this.options.gfx.strokeRoundedRect(
      renderX - timerWidth / 2,
      timerY - timerHeight * 0.45,
      timerWidth,
      timerHeight,
      timerRadius,
    );

    const timerTag = this.options.scene.add
      .text(renderX, timerY, `${Math.ceil(turnTime)}s`, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "24px",
        fontStyle: "700",
        color: "#ffffff",
        stroke: "#10131b",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScale(worldUiScale)
      .setDepth(16);
    this.vehicleLabels.push(timerTag);

    const turnTag = this.options.scene.add
      .text(renderX, timerY + overlayLayout.turnTagGapY, "TURN", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "11px",
        fontStyle: "700",
        color: "#ffd166",
        stroke: "#10131b",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScale(worldUiScale)
      .setDepth(16);
    this.vehicleLabels.push(turnTag);
  }
}
