import Phaser from "phaser";
import type { VehicleState } from "../MatchTypes";

export interface CommandDeckAimDialTargets {
  hudGfx: Phaser.GameObjects.Graphics;
  aimDialText: Phaser.GameObjects.Text;
}

export class CommandDeckAimDial {
  constructor(private readonly targets: CommandDeckAimDialTargets) {}

  draw(
    active: VehicleState,
    panelX: number,
    panelY: number,
    panelWidth: number,
    panelHeight: number,
    scale = 1,
  ): void {
    const scaled = (pixels: number): number => Math.round(pixels * scale);
    const centerX = panelX + panelWidth / 2;
    const centerY = panelY + panelHeight - scaled(24);
    const radius = scaled(52);
    const elevation = active.facing === 1 ? active.angle : 180 - active.angle;
    const radians = Phaser.Math.DegToRad(180 + elevation);
    const needleX = centerX - Math.cos(radians) * radius;
    const needleY = centerY + Math.sin(radians) * radius;

    this.targets.hudGfx.fillStyle(0x111827, 1);
    this.targets.hudGfx.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, Math.max(4, scaled(8)));
    this.targets.hudGfx.lineStyle(2, active.accent, 0.55);
    this.targets.hudGfx.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, Math.max(4, scaled(8)));
    this.targets.hudGfx.lineStyle(3, 0x30405f, 1);
    this.targets.hudGfx.beginPath();
    this.targets.hudGfx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2, false);
    this.targets.hudGfx.strokePath();
    this.targets.hudGfx.lineStyle(Math.max(3, scaled(6)), active.accent, 1);
    this.targets.hudGfx.lineBetween(centerX, centerY, needleX, needleY);
    this.targets.hudGfx.fillStyle(0xffffff, 1);
    this.targets.hudGfx.fillCircle(centerX, centerY, Math.max(3, scaled(5)));
    this.targets.hudGfx.fillStyle(active.accent, 1);
    this.targets.hudGfx.fillCircle(needleX, needleY, Math.max(4, scaled(7)));

    this.targets.aimDialText
      .setPosition(centerX, panelY + scaled(14))
      .setText(`AIM ${Math.round(elevation)} deg\n${active.facing === 1 ? "right" : "left"}`)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${Math.max(11, scaled(15))}px`,
        fontStyle: "700",
        color: "#ffffff",
        align: "center",
        stroke: "#0b1020",
        strokeThickness: 4,
      });
  }
}
