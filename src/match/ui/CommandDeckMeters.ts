import Phaser from "phaser";
import { MAX_MOVE_UNITS } from "../../../shared/v1/tuning.js";

export interface CommandDeckMeterTargets {
  hudGfx: Phaser.GameObjects.Graphics;
  powerLabelText: Phaser.GameObjects.Text;
  powerHintText: Phaser.GameObjects.Text;
  movementLabelText: Phaser.GameObjects.Text;
}

export class CommandDeckMeters {
  constructor(private readonly targets: CommandDeckMeterTargets) {}

  drawLaunchPowerMeter(
    x: number,
    y: number,
    width: number,
    value: number,
    charging: boolean,
    scale = 1,
  ): void {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    const percent = Math.round(clamped * 100);
    const scaled = (pixels: number): number => Math.round(pixels * scale);
    const compact = width < 320 * scale;
    const height = scaled(76);
    const meterX = x + scaled(14);
    const meterY = y + scaled(34);
    const meterWidth = width - scaled(28);
    const meterHeight = scaled(28);
    const radius = Math.max(4, scaled(8));
    const meterRadius = Math.max(4, scaled(7));

    this.targets.hudGfx.fillStyle(0x111827, 1);
    this.targets.hudGfx.fillRoundedRect(x, y, width, height, radius);
    this.targets.hudGfx.lineStyle(2, charging ? 0xffd166 : 0xffffff, charging ? 0.72 : 0.22);
    this.targets.hudGfx.strokeRoundedRect(x, y, width, height, radius);

    this.targets.powerLabelText
      .setPosition(x + scaled(14), y + scaled(10))
      .setOrigin(0, 0)
      .setText(`${compact ? "POWER" : "LAUNCH POWER"} ${percent}%`)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${Math.max(12, scaled(17))}px`,
        fontStyle: "700",
        color: "#fff4c2",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    this.targets.powerHintText
      .setPosition(x + width - scaled(14), y + scaled(13))
      .setOrigin(1, 0)
      .setText(charging ? (compact ? "FIRE" : "RELEASE TO FIRE") : compact ? "SPACE" : "HOLD SPACE")
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: `${Math.max(10, scaled(12))}px`,
        fontStyle: "700",
        color: charging ? "#ffffff" : "#aeb7c8",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    this.targets.hudGfx.fillStyle(0x182033, 1);
    this.targets.hudGfx.fillRoundedRect(meterX, meterY, meterWidth, meterHeight, meterRadius);
    this.targets.hudGfx.fillStyle(0xffd166, 1);
    this.targets.hudGfx.fillRoundedRect(meterX, meterY, meterWidth * clamped, meterHeight, meterRadius);
    this.targets.hudGfx.fillStyle(0xffffff, charging ? 0.18 : 0.08);
    this.targets.hudGfx.fillRoundedRect(
      meterX,
      meterY + scaled(4),
      meterWidth * clamped,
      Math.max(3, scaled(7)),
      Math.max(2, scaled(4)),
    );

    for (let i = 1; i < 4; i += 1) {
      const tickX = meterX + (meterWidth * i) / 4;
      this.targets.hudGfx.lineStyle(2, 0x0b1020, 0.42);
      this.targets.hudGfx.lineBetween(tickX, meterY + scaled(4), tickX, meterY + meterHeight - scaled(4));
      this.targets.hudGfx.lineStyle(1, 0xffffff, 0.2);
      this.targets.hudGfx.lineBetween(tickX + 1, meterY + scaled(5), tickX + 1, meterY + meterHeight - scaled(5));
    }

    this.targets.hudGfx.lineStyle(2, 0xfff4c2, 0.72);
    this.targets.hudGfx.strokeRoundedRect(meterX, meterY, meterWidth, meterHeight, meterRadius);
  }

  drawMoveMeter(x: number, y: number, width: number, remainingUnits: number, scale = 1): void {
    const clamped = Phaser.Math.Clamp(remainingUnits / MAX_MOVE_UNITS, 0, 1);
    const label = `${remainingUnits.toFixed(1)}u`;
    const scaled = (pixels: number): number => Math.round(pixels * scale);
    const height = scaled(42);
    const radius = Math.max(4, scaled(8));

    this.targets.hudGfx.fillStyle(0x111827, 0.96);
    this.targets.hudGfx.fillRoundedRect(x, y, width, height, radius);
    this.targets.hudGfx.lineStyle(2, 0x57f287, 0.42);
    this.targets.hudGfx.strokeRoundedRect(x, y, width, height, radius);

    this.targets.movementLabelText
      .setPosition(x + scaled(12), y + scaled(7))
      .setOrigin(0, 0)
      .setText(`MOVE RANGE  ${label}`)
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: `${Math.max(10, scaled(13))}px`,
        fontStyle: "700",
        color: "#b9ffd0",
        stroke: "#0b1020",
        strokeThickness: 4,
      });

    const meterX = x + scaled(12);
    const meterY = y + scaled(27);
    const meterWidth = width - scaled(24);
    const meterHeight = Math.max(5, scaled(8));
    this.targets.hudGfx.fillStyle(0x182033, 1);
    this.targets.hudGfx.fillRoundedRect(meterX, meterY, meterWidth, meterHeight, Math.max(3, scaled(4)));
    this.targets.hudGfx.fillStyle(0x57f287, 0.95);
    this.targets.hudGfx.fillRoundedRect(meterX, meterY, meterWidth * clamped, meterHeight, Math.max(3, scaled(4)));
    this.targets.hudGfx.lineStyle(1, 0xffffff, 0.22);
    this.targets.hudGfx.strokeRoundedRect(meterX, meterY, meterWidth, meterHeight, Math.max(3, scaled(4)));
  }
}
