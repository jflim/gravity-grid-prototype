import Phaser from "phaser";
import type { ProjectileState } from "../MatchTypes";

export class ProjectileRenderer {
  constructor(
    private readonly gfx: Phaser.GameObjects.Graphics,
    private readonly projectileRadius: number,
  ) {}

  draw(projectile?: ProjectileState): void {
    this.gfx.clear();
    if (!projectile) {
      return;
    }

    for (let i = 0; i < projectile.trail.length; i += 1) {
      const point = projectile.trail[i];
      const t = i / Math.max(projectile.trail.length - 1, 1);
      this.gfx.fillStyle(0xffd166, 0.08 + t * 0.46);
      this.gfx.fillCircle(point.x, point.y, 3 + t * 5);
    }

    this.gfx.fillStyle(projectile.team === "red" ? 0xff4d5d : 0x4cc9f0, 1);
    this.gfx.fillCircle(projectile.x, projectile.y, this.projectileRadius);
    this.gfx.fillStyle(0xffffff, 0.85);
    this.gfx.fillCircle(projectile.x - 3, projectile.y - 3, 4);
  }
}
