import Phaser from "phaser";
import {
  computeCommandDeckElementLayout,
  computeCommandPanelLayout,
} from "../../demoLayout";
import type { VehicleState } from "../MatchTypes";
import { MAX_HP, MAX_POWER } from "../../../shared/v1/tuning.js";
import { CommandDeckAimDial } from "./CommandDeckAimDial";
import { CommandDeckMeters } from "./CommandDeckMeters";
import { WindHud } from "./WindHud";

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
  private readonly aimDial: CommandDeckAimDial;
  private readonly meters: CommandDeckMeters;
  private readonly windHud: WindHud;

  constructor(private readonly targets: CommandDeckTargets) {
    this.aimDial = new CommandDeckAimDial(targets);
    this.meters = new CommandDeckMeters(targets);
    this.windHud = new WindHud(targets);
  }

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
      this.windHud.draw(input.windLabel);
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

    this.meters.drawMoveMeter(deck.moveMeter.x, deck.moveMeter.y, deck.moveMeter.width, active.moveUnits, deckScale);

    const power = input.charging ? input.charge / MAX_POWER : 0;
    this.meters.drawLaunchPowerMeter(
      deck.launchMeter.x,
      deck.launchMeter.y,
      deck.launchMeter.width,
      power,
      input.charging,
      deckScale,
    );

    this.aimDial.draw(active, deck.aimPanel.x, deck.aimPanel.y, deck.aimPanel.width, deck.aimPanel.height, deckScale);
    this.windHud.draw(input.windLabel);
  }
}
