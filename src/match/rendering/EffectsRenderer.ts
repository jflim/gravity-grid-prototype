import Phaser from "phaser";
import type { ImpactPreview, VehicleState } from "../MatchTypes";

export interface EffectsRendererOptions {
  worldHeight: number;
  moveMinX: number;
  moveMaxX: number;
  movePixelsPerUnit: number;
  impactPreviewSeconds: number;
  surfaceAt: (x: number) => number;
}

export interface DrawAimEffectsInput {
  active?: VehicleState;
  canAct: boolean;
}

export class EffectsRenderer {
  constructor(
    private readonly aimGfx: Phaser.GameObjects.Graphics,
    private readonly impactGfx: Phaser.GameObjects.Graphics,
    private readonly options: EffectsRendererOptions,
  ) {}

  drawAim(input: DrawAimEffectsInput): void {
    this.aimGfx.clear();
    const active = input.active;
    if (!active || !input.canAct) {
      return;
    }

    this.drawMoveRange(active);

    const radians = Phaser.Math.DegToRad(active.angle);
    const dirX = Math.cos(radians);
    const dirY = -Math.sin(radians);
    const muzzleX = active.x + dirX * 48;
    const muzzleY = active.y - 13 + dirY * 48;
    const lineLength = 172;
    const tipX = muzzleX + dirX * lineLength;
    const tipY = muzzleY + dirY * lineLength;
    const baseX = tipX - dirX * 20;
    const baseY = tipY - dirY * 20;
    const perpX = -dirY;
    const perpY = dirX;

    this.aimGfx.lineStyle(7, 0x0b1020, 0.68);
    this.aimGfx.lineBetween(muzzleX, muzzleY, tipX, tipY);
    this.aimGfx.lineStyle(3, active.accent, 0.95);
    this.aimGfx.lineBetween(muzzleX, muzzleY, tipX, tipY);
    this.aimGfx.fillStyle(active.accent, 0.96);
    this.aimGfx.fillTriangle(
      tipX,
      tipY,
      baseX + perpX * 10,
      baseY + perpY * 10,
      baseX - perpX * 10,
      baseY - perpY * 10,
    );
    this.aimGfx.fillStyle(0xffffff, 0.92);
    this.aimGfx.fillCircle(muzzleX, muzzleY, 4);
  }

  drawImpactPreview(preview?: ImpactPreview): void {
    this.impactGfx.clear();
    if (!preview) {
      return;
    }

    const alpha = Phaser.Math.Clamp(preview.timeLeft / this.options.impactPreviewSeconds, 0, 1);
    this.impactGfx.fillStyle(0xfff4c2, 0.08 * alpha);
    this.impactGfx.fillCircle(preview.x, preview.y, preview.damageRadius);
    this.impactGfx.lineStyle(4, 0xfff4c2, 0.62 * alpha);
    this.impactGfx.strokeCircle(preview.x, preview.y, preview.damageRadius);

    const craterColor = preview.isBungerShot ? 0xff7a5c : 0x8be9ff;
    this.impactGfx.fillStyle(craterColor, 0.1 * alpha);
    this.impactGfx.fillCircle(preview.x, preview.y, preview.craterRadius);
    this.impactGfx.lineStyle(3, craterColor, 0.86 * alpha);
    this.impactGfx.strokeCircle(preview.x, preview.y, preview.craterRadius);
  }

  private drawMoveRange(active: VehicleState): void {
    const maxDistance = active.moveUnits * this.options.movePixelsPerUnit;
    if (maxDistance <= 1) {
      return;
    }

    const leftX = Phaser.Math.Clamp(active.x - maxDistance, this.options.moveMinX, this.options.moveMaxX);
    const rightX = Phaser.Math.Clamp(active.x + maxDistance, this.options.moveMinX, this.options.moveMaxX);

    this.aimGfx.lineStyle(7, 0x0b1020, 0.5);
    this.drawTerrainRangeLine(leftX, rightX, 10);
    this.aimGfx.lineStyle(4, 0x57f287, 0.58);
    this.drawTerrainRangeLine(leftX, rightX, 10);

    const tickCount = Math.floor((rightX - leftX) / this.options.movePixelsPerUnit);
    this.aimGfx.lineStyle(2, 0xb9ffd0, 0.72);
    for (let i = 0; i <= tickCount; i += 1) {
      const x = leftX + i * this.options.movePixelsPerUnit;
      const y = this.options.surfaceAt(x) - 10;
      if (y >= this.options.worldHeight) {
        continue;
      }
      this.aimGfx.lineBetween(x, y - 6, x, y + 6);
    }
  }

  private drawTerrainRangeLine(startX: number, endX: number, yOffset: number): void {
    let drawing = false;
    this.aimGfx.beginPath();
    for (let x = startX + 8; x <= endX; x += 8) {
      const y = this.options.surfaceAt(x) - yOffset;
      if (y >= this.options.worldHeight) {
        drawing = false;
        continue;
      }
      if (!drawing) {
        this.aimGfx.moveTo(x, y);
        drawing = true;
      } else {
        this.aimGfx.lineTo(x, y);
      }
    }
    this.aimGfx.strokePath();
  }
}
