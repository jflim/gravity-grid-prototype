import Phaser from "phaser";
import { computeWindHudLayout } from "../../demoLayout";

export interface WindHudTargets {
  scene: Phaser.Scene;
  hudGfx: Phaser.GameObjects.Graphics;
  timerText: Phaser.GameObjects.Text;
  windText: Phaser.GameObjects.Text;
}

export class WindHud {
  constructor(private readonly targets: WindHudTargets) {}

  draw(windLabel: string): void {
    const layout = computeWindHudLayout({
      width: this.targets.scene.scale.width,
      height: this.targets.scene.scale.height,
    });
    this.targets.timerText.setText("");

    this.targets.hudGfx.fillStyle(0x06111f, 0.9);
    this.targets.hudGfx.fillRoundedRect(layout.x - layout.width / 2, layout.y, layout.width, layout.height, 8);
    this.targets.hudGfx.fillStyle(0x8be9ff, 0.09);
    this.targets.hudGfx.fillRoundedRect(layout.x - layout.width / 2 + 5, layout.y + 5, layout.width - 10, 12, 6);
    this.targets.hudGfx.lineStyle(2, 0x8be9ff, 0.5);
    this.targets.hudGfx.strokeRoundedRect(layout.x - layout.width / 2, layout.y, layout.width, layout.height, 8);
    this.targets.windText
      .setOrigin(0.5)
      .setPosition(layout.x, layout.y + layout.height / 2)
      .setText(`WIND ${windLabel}`)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "26px",
        fontStyle: "700",
        color: "#8be9ff",
        stroke: "#0b1020",
        strokeThickness: 7,
      });
  }
}
