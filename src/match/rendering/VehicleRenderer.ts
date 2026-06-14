import Phaser from "phaser";
import type { CharacterPose } from "../../../shared/model/gameTypes.js";
import { MAX_HP, VEHICLE_HALF_WIDTH } from "../../../shared/v1/tuning.js";
import {
  defeatPresentationFor,
  scaleBattlefieldDisplay,
  scaleBattlefieldOffset,
} from "../../combatPresentation";
import { collisionZoneOverlayStyle } from "../../collisionOverlay";
import {
  computeUnitWorldOverlayLayout,
  readableWorldUiScale,
} from "../../demoLayout";
import { voidDropRenderPosition } from "../../voidDropPresentation";
import type { VehicleState } from "../MatchTypes";
import { VehicleGeometry } from "../VehicleGeometry";

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
  private readonly vehicleSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly characterSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly vehicleGeometry = new VehicleGeometry();
  private vehicleLabels: Phaser.GameObjects.Text[] = [];

  constructor(private readonly options: VehicleRendererOptions) {}

  draw(input: DrawVehiclesInput): void {
    const worldUiScale = readableWorldUiScale(input.cameraZoom);
    const overlayLayout = computeUnitWorldOverlayLayout({
      useUnitConceptPreview: this.options.useUnitConceptPreview,
      worldUiScale,
    });
    this.options.gfx.clear();
    this.options.collisionGfx.clear();

    for (const label of this.vehicleLabels) {
      label.destroy();
    }
    this.vehicleLabels = [];

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
      const vehicleKey = vehicle.alive ? vehicle.vehicleSpriteKey : vehicle.vehicleDestroyedSpriteKey;
      const vehicleDisplay = vehicle.alive ? vehicle.vehicleDisplay : vehicle.vehicleDestroyedDisplay;
      const slopeAngle = vehicle.defeatReason === "void" ? 0 : this.terrainAngleAt(vehicle.x);
      const koTilt = vehicle.alive ? 0 : vehicle.team === "red" ? -8 : 8;
      const vehicleSprite =
        this.vehicleSprites.get(vehicle.id) ?? this.options.scene.add.image(renderX, renderY, vehicleKey);
      if (!this.vehicleSprites.has(vehicle.id)) {
        vehicleSprite.setDepth(11);
        this.vehicleSprites.set(vehicle.id, vehicleSprite);
      }

      this.drawFootingMarker(vehicle, active);

      if (
        this.options.useUnitConceptPreview &&
        vehicle.unitConceptSpriteKeys &&
        vehicle.unitConceptDisplays &&
        vehicle.unitConceptSpriteFaces
      ) {
        const conceptPose = this.characterPoseFor(vehicle, active, input.charging);
        const conceptKey = vehicle.unitConceptSpriteKeys[conceptPose];
        const conceptDisplay = scaleBattlefieldDisplay(vehicle.unitConceptDisplays[conceptPose]);
        vehicleSprite
          .setTexture(conceptKey)
          .setOrigin(0.5, 0.86)
          .setPosition(renderX, renderY + scaleBattlefieldOffset(vehicle.unitConceptOffsetY ?? 24))
          .setDisplaySize(conceptDisplay.width, conceptDisplay.height)
          .setFlipX(vehicle.facing !== vehicle.unitConceptSpriteFaces)
          .setAlpha(alpha)
          .setAngle(slopeAngle + koTilt);
        if (defeatPresentation?.tint) {
          vehicleSprite.setTint(defeatPresentation.tint);
        } else {
          vehicleSprite.clearTint();
        }
        this.characterSprites.get(vehicle.id)?.setAlpha(0);
      } else {
        vehicleSprite
          .setTexture(vehicleKey)
          .setOrigin(0.5, 0.86)
          .setPosition(renderX, renderY + 20)
          .setDisplaySize(vehicleDisplay.width, vehicleDisplay.height)
          .setFlipX(vehicle.facing !== vehicle.vehicleSpriteFaces)
          .setAlpha(alpha)
          .setAngle(slopeAngle + koTilt);

        if (defeatPresentation?.tint) {
          vehicleSprite.setTint(defeatPresentation.tint);
        } else {
          vehicleSprite.clearTint();
        }

        const characterPose = this.characterPoseFor(vehicle, active, input.charging);
        const characterKey = vehicle.characterSpriteKeys[characterPose];
        const characterDisplay = vehicle.characterDisplays[characterPose];
        const characterX =
          renderX + this.orientedOffset(vehicle, vehicle.characterOffsetX, vehicle.characterSpriteFaces);
        const characterSprite =
          this.characterSprites.get(vehicle.id) ?? this.options.scene.add.image(characterX, renderY, characterKey);
        if (!this.characterSprites.has(vehicle.id)) {
          characterSprite.setDepth(12);
          this.characterSprites.set(vehicle.id, characterSprite);
        }
        characterSprite
          .setTexture(characterKey)
          .setOrigin(0.5, 0.88)
          .setPosition(characterX, renderY + vehicle.characterOffsetY)
          .setDisplaySize(characterDisplay.width, characterDisplay.height)
          .setFlipX(vehicle.facing !== vehicle.characterSpriteFaces)
          .setAlpha(alpha)
          .setAngle(slopeAngle + koTilt);
        if (defeatPresentation?.tint) {
          characterSprite.setTint(defeatPresentation.tint);
        } else {
          characterSprite.clearTint();
        }
      }

      if (input.showCombatHulls && vehicle.alive) {
        this.drawCombatHull(vehicle, active);
      }

      if (vehicle.alive || vehicle.defeatReason === "damage") {
        this.drawHpBar(vehicle, renderX, renderY, overlayLayout, worldUiScale);
      }

      this.drawLabels(vehicle, renderX, renderY, overlayLayout, worldUiScale, defeatPresentation?.label, active, input.turnTime);
    }
  }

  private characterPoseFor(vehicle: VehicleState, active: boolean, charging: boolean): CharacterPose {
    if (!vehicle.alive) {
      return "ko";
    }

    return active && charging ? "intense" : "default";
  }

  private orientedOffset(vehicle: VehicleState, offset: number, nativeFacing: 1 | -1): number {
    return this.vehicleGeometry.orientedOffset(vehicle, offset, nativeFacing);
  }

  private terrainAngleAt(x: number): number {
    const sampleDistance = 22;
    const left = this.options.surfaceAt(x - sampleDistance);
    const right = this.options.surfaceAt(x + sampleDistance);
    return Phaser.Math.RadToDeg(Math.atan2(right - left, sampleDistance * 2));
  }

  private drawFootingMarker(vehicle: VehicleState, active: boolean): void {
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

  private drawCombatHull(vehicle: VehicleState, active: boolean): void {
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

  private drawHpBar(
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

  private drawLabels(
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
