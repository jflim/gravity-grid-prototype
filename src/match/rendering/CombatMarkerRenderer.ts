import Phaser from "phaser";
import type { CombatMarkerKind } from "../../../shared/model/gameTypes.js";
import type { CombatMarker, VehicleState } from "../MatchTypes";

export interface CombatMarkerRendererOptions {
  scene: Phaser.Scene;
  durationSeconds: number;
  unitConceptPreview: boolean;
  worldUiScale: () => number;
}

export class CombatMarkerRenderer {
  private markers: CombatMarker[] = [];

  constructor(private readonly options: CombatMarkerRendererOptions) {}

  add(kind: CombatMarkerKind, label: string, x: number, y: number): void {
    const style = this.combatMarkerStyle(kind);
    const text = this.options.scene.add
      .text(x, y, label, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: kind === "ko" || kind === "bunged" ? "24px" : "21px",
        fontStyle: "800",
        color: style.color,
        stroke: "#10131b",
        strokeThickness: 7,
      })
      .setOrigin(0.5)
      .setScale(this.options.worldUiScale())
      .setDepth(35);

    this.markers.push({
      kind,
      label,
      x,
      y,
      age: 0,
      duration: this.options.durationSeconds,
      lift: style.lift,
      text,
    });
  }

  addForVehicle(vehicle: VehicleState, kind: CombatMarkerKind, label: string, slot = 0): void {
    const yOffset = this.options.unitConceptPreview ? 176 : 104;
    this.add(kind, label, vehicle.x, vehicle.y - yOffset - slot * 26);
  }

  update(dt: number): void {
    for (const marker of this.markers) {
      marker.age += dt;
      const progress = Phaser.Math.Clamp(marker.age / marker.duration, 0, 1);
      marker.text
        .setPosition(marker.x, marker.y - marker.lift * Phaser.Math.Easing.Sine.Out(progress))
        .setScale(this.options.worldUiScale())
        .setAlpha(Phaser.Math.Clamp(1 - progress, 0, 1));
    }

    const expired = this.markers.filter((marker) => marker.age >= marker.duration);
    for (const marker of expired) {
      marker.text.destroy();
    }
    this.markers = this.markers.filter((marker) => marker.age < marker.duration);
  }

  clear(): void {
    for (const marker of this.markers) {
      marker.text.destroy();
    }
    this.markers = [];
  }

  private combatMarkerStyle(kind: CombatMarkerKind): { color: string; lift: number } {
    switch (kind) {
      case "direct":
        return { color: "#ff6b6b", lift: 54 };
      case "splash":
        return { color: "#ffd166", lift: 46 };
      case "shoved":
        return { color: "#8be9ff", lift: 40 };
      case "ko":
        return { color: "#ff8bd1", lift: 58 };
      case "bunged":
        return { color: "#ff8bd1", lift: 58 };
    }
  }
}
