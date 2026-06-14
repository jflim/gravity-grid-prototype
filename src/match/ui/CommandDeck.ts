import Phaser from "phaser";
import {
  computeCommandDeckElementLayout,
  computeCommandPanelLayout,
  computeWindHudLayout,
} from "../../demoLayout";
import type { VehicleState } from "../MatchTypes";
import { MAX_HP, MAX_MOVE_UNITS, MAX_POWER } from "../../../shared/v1/tuning.js";

export interface CommandDeckTargets {
  scene: Phaser.Scene;
  hudGfx: Phaser.GameObjects.Graphics;
  hudText: Phaser.GameObjects.Text;
  rosterText: Phaser.GameObjects.Text;
  eventText: Phaser.GameObjects.Text;
  timerText: Phaser.GameObjects.Text;
  windText: Phaser.GameObjects.Text;
  powerLabelText: Phaser.GameObjects.Text;
  powerHintText: Phaser.GameObjects.Text;
  aimDialText: Phaser.GameObjects.Text;
  movementLabelText: Phaser.GameObjects.Text;
  hudPortrait: Phaser.GameObjects.Image;
}

export interface DrawCommandDeckInput {
  active?: VehicleState;
  roundComplete: boolean;
  shotResult: string;
  projectileInFlight: boolean;
  charging: boolean;
  charge: number;
  windLabel: string;
}

export class CommandDeck {
  constructor(private readonly targets: CommandDeckTargets) {}

  draw(input: DrawCommandDeckInput): void {
    const width = this.targets.scene.scale.width;
    const height = this.targets.scene.scale.height;
    const layout = computeCommandPanelLayout({ width, height });
    const panelWidth = layout.dockWidth;
    const panelHeight = layout.panelHeight;
    const panelX = layout.dockX;
    const panelY = layout.panelY;
    const deck = computeCommandDeckElementLayout(layout);
    const deckScale = layout.contentScale;
    const scaled = (value: number): number => Math.round(value * deckScale);
    const rounded = (value: number): number => Math.max(4, scaled(value));

    this.targets.hudGfx.clear();
    this.targets.timerText.setText("");
    this.targets.hudGfx.fillStyle(0x0b1020, 0.92);
    this.targets.hudGfx.fillRect(0, panelY, width, panelHeight);
    this.targets.hudGfx.fillStyle(0x050817, 0.96);
    this.targets.hudGfx.fillRect(0, panelY + panelHeight, width, layout.bottomMargin);
    this.targets.hudGfx.lineStyle(4, 0x8be9ff, 0.36);
    this.targets.hudGfx.lineBetween(0, panelY, width, panelY);
    this.targets.hudGfx.lineStyle(1, 0xffffff, 0.08);
    this.targets.hudGfx.lineBetween(0, panelY + 5, width, panelY + 5);

    if (!input.active) {
      this.targets.hudPortrait.setAlpha(0);
      this.targets.hudText
        .setPosition(panelX + scaled(24), panelY + scaled(28))
        .setText(input.roundComplete ? "Round complete" : "Waiting")
        .setStyle({
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: `${deck.titleFontSize}px`,
          fontStyle: "700",
          color: "#ffffff",
          stroke: "#10131b",
          strokeThickness: 4,
        });
      this.targets.rosterText
        .setPosition(panelX + scaled(24), panelY + scaled(68))
        .setText(input.roundComplete ? "Next round starts automatically. Press R to restart now." : "Waiting for turn.")
        .setStyle({
          fontFamily: "Consolas, 'SFMono-Regular', monospace",
          fontSize: `${deck.detailFontSize}px`,
          color: "#ffd166",
          stroke: "#10131b",
          strokeThickness: 4,
        });
      this.targets.eventText
        .setPosition(panelX + scaled(24), panelY + scaled(104))
        .setText(input.shotResult)
        .setStyle({
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: `${Math.max(11, scaled(14))}px`,
          color: "#ffd166",
          stroke: "#10131b",
          strokeThickness: 4,
        });
      this.targets.powerLabelText.setText("");
      this.targets.powerHintText.setText("");
      this.targets.movementLabelText.setText("");
      this.targets.aimDialText.setText("");
      this.drawGlobalRoundStatus(input.windLabel);
      return;
    }

    const active = input.active;
    const accentColor = active.team === "red" ? "#ffd166" : "#8be9ff";
    this.targets.hudGfx.fillStyle(0x111827, 1);
    this.targets.hudGfx.fillRoundedRect(
      deck.portraitFrame.x,
      deck.portraitFrame.y,
      deck.portraitFrame.width,
      deck.portraitFrame.height,
      rounded(8),
    );
    this.targets.hudGfx.lineStyle(2, active.accent, 0.72);
    this.targets.hudGfx.strokeRoundedRect(
      deck.portraitFrame.x,
      deck.portraitFrame.y,
      deck.portraitFrame.width,
      deck.portraitFrame.height,
      rounded(8),
    );
    this.targets.hudPortrait
      .setTexture(active.portraitKey)
      .setPosition(deck.portrait.x, deck.portrait.y)
      .setDisplaySize(deck.portrait.width, deck.portrait.height)
      .setAlpha(1);

    this.targets.hudText
      .setPosition(deck.title.x, deck.title.y)
      .setText(active.username)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${deck.titleFontSize}px`,
        fontStyle: "700",
        color: "#ffffff",
        stroke: "#10131b",
        strokeThickness: 4,
      });
    this.targets.rosterText
      .setPosition(deck.detail.x, deck.detail.y)
      .setText(`${active.className}     HP ${active.hp}/${MAX_HP}`)
      .setStyle({
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: `${deck.detailFontSize}px`,
        color: accentColor,
        stroke: "#10131b",
        strokeThickness: 4,
      });
    this.targets.eventText
      .setPosition(deck.event.x, deck.event.y)
      .setText(input.projectileInFlight ? "Shot in flight..." : input.shotResult)
      .setStyle({
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: `${Math.max(11, scaled(14))}px`,
        color: "#ffd166",
        stroke: "#10131b",
        strokeThickness: 4,
      });

    this.drawMoveMeter(deck.moveMeter.x, deck.moveMeter.y, deck.moveMeter.width, active.moveUnits, deckScale);

    const power = input.charging ? input.charge / MAX_POWER : 0;
    this.drawLaunchPowerMeter(deck.launchMeter.x, deck.launchMeter.y, deck.launchMeter.width, power, input.charging, deckScale);

    this.drawPanelAimDial(active, deck.aimPanel.x, deck.aimPanel.y, deck.aimPanel.width, deck.aimPanel.height, deckScale);
    this.drawGlobalRoundStatus(input.windLabel);
  }

  private drawGlobalRoundStatus(windLabel: string): void {
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

  private drawLaunchPowerMeter(
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

  private drawMoveMeter(x: number, y: number, width: number, remainingUnits: number, scale = 1): void {
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

  private drawPanelAimDial(
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
