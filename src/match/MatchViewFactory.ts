import Phaser from "phaser";
import { COLLISION_ZONE_OVERLAY_DEPTH } from "../collisionOverlay";
import { readableWorldUiScale } from "../demoLayout";
import { CombatMarkerRenderer } from "./rendering/CombatMarkerRenderer";
import { EffectsRenderer } from "./rendering/EffectsRenderer";
import { ProjectileRenderer } from "./rendering/ProjectileRenderer";
import { TerrainRenderer } from "./rendering/TerrainRenderer";
import { VehicleRenderer } from "./rendering/VehicleRenderer";
import type { MatchViewCollaborators } from "./MatchView";
import { CommandDeck } from "./ui/CommandDeck";
import { CollisionZonesToggle } from "./ui/CollisionZonesToggle";

export interface MatchViewFactoryOptions {
  scene: Phaser.Scene;
  document: Document;
  mountTarget: HTMLElement;
  worldWidth: number;
  worldHeight: number;
  worldRenderHeight: number;
  projectileRadius: number;
  showCombatHulls: boolean;
  useUnitConceptPreview: boolean;
  useStyleReferenceBackground: boolean;
  moveMinX: number;
  moveMaxX: number;
  movePixelsPerUnit: number;
  impactPreviewSeconds: number;
  combatMarkerSeconds: number;
  surfaceAt: (x: number) => number;
  onCollisionZonesVisibleChange: (visible: boolean) => void;
}

export function createMatchViewCollaborators(options: MatchViewFactoryOptions): MatchViewCollaborators {
  const terrainGfx = options.scene.add.graphics();
  const aimGfx = options.scene.add.graphics();
  const impactGfx = options.scene.add.graphics().setDepth(9);
  const vehicleGfx = options.scene.add.graphics();
  const collisionGfx = options.scene.add.graphics().setDepth(COLLISION_ZONE_OVERLAY_DEPTH);
  const projectileGfx = options.scene.add.graphics();
  const hudGfx = options.scene.add.graphics().setScrollFactor(0).setDepth(50);
  const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: "16px",
    color: "#f8fbff",
    stroke: "#10131b",
    strokeThickness: 4,
  };

  const commandDeck = new CommandDeck({
    scene: options.scene,
    hudGfx,
    hudText: options.scene.add.text(18, 16, "", textStyle).setScrollFactor(0).setDepth(51),
    rosterText: options.scene.add.text(18, 70, "", textStyle).setScrollFactor(0).setDepth(51),
    eventText: options.scene.add
      .text(18, 118, "", {
        ...textStyle,
        fontSize: "15px",
        color: "#ffd166",
      })
      .setScrollFactor(0)
      .setDepth(51),
    timerText: options.scene.add
      .text(options.scene.scale.width / 2, 12, "", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "42px",
        color: "#ffffff",
        stroke: "#0b1020",
        strokeThickness: 8,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(52),
    windText: options.scene.add
      .text(24, 16, "", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "30px",
        fontStyle: "700",
        color: "#8be9ff",
        stroke: "#0b1020",
        strokeThickness: 7,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(52),
    powerLabelText: options.scene.add
      .text(options.scene.scale.width / 2, options.scene.scale.height - 88, "SHOT POWER", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "700",
        color: "#fff4c2",
        stroke: "#0b1020",
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(52),
    powerHintText: options.scene.add
      .text(options.scene.scale.width / 2, options.scene.scale.height - 44, "", {
        fontFamily: "Consolas, 'SFMono-Regular', monospace",
        fontSize: "13px",
        fontStyle: "700",
        color: "#fff4c2",
        stroke: "#0b1020",
        strokeThickness: 4,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(52),
    aimDialText: options.scene.add
      .text(options.scene.scale.width - 142, 24, "", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "700",
        color: "#f8fbff",
        stroke: "#0b1020",
        strokeThickness: 4,
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(52),
    movementLabelText: options.scene.add
      .text(options.scene.scale.width / 2, options.scene.scale.height - 88, "MOVE UNITS", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "700",
        color: "#b9ffd0",
        stroke: "#0b1020",
        strokeThickness: 4,
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(52),
    hudPortrait: options.scene.add.image(0, 0, "nova-vehicle").setScrollFactor(0).setDepth(52).setOrigin(0.5),
  });

  return {
    background: {
      create: () => createBackground(options),
    },
    terrainRenderer: new TerrainRenderer(terrainGfx),
    effectsRenderer: new EffectsRenderer(aimGfx, impactGfx, {
      worldHeight: options.worldHeight,
      moveMinX: options.moveMinX,
      moveMaxX: options.moveMaxX,
      movePixelsPerUnit: options.movePixelsPerUnit,
      impactPreviewSeconds: options.impactPreviewSeconds,
      surfaceAt: options.surfaceAt,
    }),
    vehicleRenderer: new VehicleRenderer({
      scene: options.scene,
      gfx: vehicleGfx,
      collisionGfx,
      useUnitConceptPreview: options.useUnitConceptPreview,
      surfaceAt: options.surfaceAt,
    }),
    projectileRenderer: new ProjectileRenderer(projectileGfx, options.projectileRadius),
    commandDeck,
    combatMarkerRenderer: new CombatMarkerRenderer({
      scene: options.scene,
      durationSeconds: options.combatMarkerSeconds,
      unitConceptPreview: options.useUnitConceptPreview,
      worldUiScale: () => readableWorldUiScale(options.scene.cameras.main.zoom),
    }),
    collisionZonesToggle: new CollisionZonesToggle({
      document: options.document,
      mountTarget: options.mountTarget,
      initialVisible: options.showCombatHulls,
      onChange: options.onCollisionZonesVisibleChange,
    }),
  };
}

function createBackground(options: MatchViewFactoryOptions): void {
  options.scene.add
    .rectangle(
      options.worldWidth / 2,
      options.worldRenderHeight / 2,
      options.worldWidth,
      options.worldRenderHeight,
      0x111827,
    )
    .setDepth(-100);

  if (options.useStyleReferenceBackground && options.scene.textures.exists("style-reference")) {
    const reference = options.scene.add
      .image(options.worldWidth / 2, options.worldHeight / 2, "style-reference")
      .setDisplaySize(options.worldWidth, options.worldHeight)
      .setAlpha(0.08)
      .setDepth(-99);
    reference.setTint(0x8bd7ff);
  }

  const horizon = options.scene.add.graphics().setDepth(-98);
  horizon.fillStyle(0x171f32, 0.45);
  horizon.fillRect(0, 390, options.worldWidth, options.worldHeight - 390);
  horizon.lineStyle(3, 0x42d9ff, 0.2);
  horizon.lineBetween(0, 390, options.worldWidth, 390);

  const lowerLayer = options.scene.add.graphics().setDepth(-97);
  lowerLayer.lineStyle(2, 0x27506f, 0.14);
  for (let y = 548; y < options.worldRenderHeight; y += 46) {
    lowerLayer.lineBetween(0, y, options.worldWidth, y + Math.sin(y * 0.023) * 18);
  }
  lowerLayer.lineStyle(2, 0xffd166, 0.08);
  for (let x = 80; x < options.worldWidth; x += 170) {
    lowerLayer.lineBetween(x, 540, x - 90, options.worldRenderHeight);
  }
  lowerLayer.fillStyle(0xdff9ff, 0.18);
  for (let x = 52; x < options.worldWidth; x += 137) {
    const y = 575 + ((x * 37) % 260);
    lowerLayer.fillRect(x, y, 4, 18);
  }
}
