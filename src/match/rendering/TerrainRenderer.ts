import Phaser from "phaser";
import type { PlayableTerrain } from "../../playableMaps";

export interface TerrainRenderInput {
  currentDemoMap?: PlayableTerrain;
  worldWidth: number;
  terrainStep: number;
  visibleVoidTopY: number;
  visibleVoidBottomY: number;
  terrainPlatformBottomY: number;
  terrainBreakthroughY: number;
  surfaceAt: (x: number) => number;
}

export class TerrainRenderer {
  constructor(private readonly gfx: Phaser.GameObjects.Graphics) {}

  draw(input: TerrainRenderInput): void {
    this.gfx.clear();
    this.drawVoidHazard(input);
    this.drawMapLandmarks(input, "backdrop");

    let segment: Array<{ x: number; y: number }> = [];
    const flushSegment = () => {
      if (segment.length < 2) {
        segment = [];
        return;
      }

      const first = segment[0];
      const last = segment[segment.length - 1];
      this.gfx.fillStyle(0x3c2f2f, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(first.x, input.terrainPlatformBottomY);
      for (const point of segment) {
        this.gfx.lineTo(point.x, point.y);
      }
      this.gfx.lineTo(last.x, input.terrainPlatformBottomY);
      this.gfx.closePath();
      this.gfx.fillPath();

      this.gfx.lineStyle(12, 0x92e676, 1);
      this.gfx.beginPath();
      this.gfx.moveTo(first.x, first.y);
      for (const point of segment.slice(1)) {
        this.gfx.lineTo(point.x, point.y);
      }
      this.gfx.strokePath();
      segment = [];
    };

    for (let x = 0; x <= input.worldWidth; x += input.terrainStep) {
      const surface = input.surfaceAt(x);
      if (surface >= input.terrainBreakthroughY) {
        flushSegment();
        continue;
      }
      segment.push({ x, y: surface });
    }
    flushSegment();
    this.drawMapLandmarks(input, "highlight");
  }

  private drawVoidHazard(input: TerrainRenderInput): void {
    const top = input.visibleVoidTopY;
    const bottom = input.visibleVoidBottomY;
    this.gfx.fillStyle(0x020613, 0.74);
    this.gfx.fillRect(0, top, input.worldWidth, bottom - top);
    this.gfx.lineStyle(5, 0x8be9ff, 0.38);
    this.gfx.lineBetween(0, top, input.worldWidth, top);
    this.gfx.lineStyle(2, 0xff5c7a, 0.22);
    for (let y = top + 18; y < bottom; y += 28) {
      this.gfx.lineBetween(0, y, input.worldWidth, y + Math.sin(y * 0.033) * 14);
    }
    this.gfx.fillStyle(0x8be9ff, 0.2);
    for (let x = 46; x < input.worldWidth; x += 118) {
      this.gfx.fillRect(x, top + 14 + ((x * 19) % 78), 4, 28);
    }
  }

  private drawMapLandmarks(input: TerrainRenderInput, pass: "backdrop" | "highlight"): void {
    const landmarks = input.currentDemoMap?.map.landmarks ?? [];
    for (const landmark of landmarks) {
      switch (landmark.type) {
        case "ring": {
          if (pass === "backdrop") {
            this.gfx.lineStyle(18, 0x7d8fa8, 0.08);
            this.strokeEllipseArc(landmark.x, landmark.y, landmark.width / 2, landmark.height / 2, 0, Math.PI * 2);
            this.gfx.lineStyle(5, 0xb7c8da, 0.055);
            this.strokeEllipseArc(
              landmark.x,
              landmark.y,
              landmark.width * 0.37,
              landmark.height * 0.32,
              0,
              Math.PI * 2,
            );
          }
          break;
        }
        case "bridge":
        case "arch": {
          const y = landmark.y + landmark.height * 0.26;
          const left = landmark.x - landmark.width / 2;
          const right = landmark.x + landmark.width / 2;
          this.gfx.lineStyle(
            pass === "backdrop" ? 18 : 4,
            pass === "backdrop" ? 0x9b7650 : 0xffd166,
            pass === "backdrop" ? 0.2 : 0.3,
          );
          this.gfx.beginPath();
          for (let step = 0; step <= 12; step += 1) {
            const t = step / 12;
            const x = Phaser.Math.Linear(left, right, t);
            const archY = y - Math.sin(t * Math.PI) * landmark.height * 0.74;
            if (step === 0) {
              this.gfx.moveTo(x, archY);
            } else {
              this.gfx.lineTo(x, archY);
            }
          }
          this.gfx.strokePath();
          break;
        }
        case "shelf": {
          break;
        }
        case "spire": {
          if (pass === "backdrop") {
            this.gfx.fillStyle(0x7a5b3f, 0.16);
            this.gfx.fillTriangle(
              landmark.x,
              landmark.y - landmark.height / 2,
              landmark.x - landmark.width / 2,
              landmark.y + landmark.height / 2,
              landmark.x + landmark.width / 2,
              landmark.y + landmark.height / 2,
            );
          }
          break;
        }
      }
    }
  }

  private strokeEllipseArc(
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    startAngle: number,
    endAngle: number,
    steps = 28,
  ): void {
    this.gfx.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const angle = Phaser.Math.Linear(startAngle, endAngle, t);
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      if (step === 0) {
        this.gfx.moveTo(x, y);
      } else {
        this.gfx.lineTo(x, y);
      }
    }
    this.gfx.strokePath();
  }
}
