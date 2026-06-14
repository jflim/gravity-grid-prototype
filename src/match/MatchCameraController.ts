import Phaser from "phaser";
import {
  computeBattlefieldFrameLayout,
  computeCameraWorldBounds,
  computeCommandPanelLayout,
  shouldRecenterProjectileCamera,
} from "../demoLayout";
import type { ProjectileState } from "./MatchTypes";

export interface MatchCameraControllerOptions {
  scene: Phaser.Scene;
  worldWidth: number;
  worldRenderHeight: number;
  frameBottomWorldY: () => number;
}

export class MatchCameraController {
  constructor(private readonly options: MatchCameraControllerOptions) {}

  updateViewport(): void {
    this.options.scene.cameras.main.setViewport(
      0,
      0,
      this.options.scene.scale.width,
      this.playfieldHeight(),
    );
  }

  playfieldHeight(): number {
    return computeCommandPanelLayout({
      width: this.options.scene.scale.width,
      height: this.options.scene.scale.height,
    }).playfieldHeight;
  }

  frameBattlefield(aliveVehicleXs: readonly number[], duration = 0): void {
    if (aliveVehicleXs.length === 0) {
      return;
    }

    const frame = computeBattlefieldFrameLayout({
      viewportWidth: this.options.scene.scale.width,
      playfieldHeight: this.playfieldHeight(),
      worldWidth: this.options.worldWidth,
      aliveVehicleXs: [...aliveVehicleXs],
      frameBottomWorldY: this.options.frameBottomWorldY(),
    });
    const bounds = computeCameraWorldBounds({
      worldWidth: this.options.worldWidth,
      visibleWorldWidth: frame.visibleWorldWidth,
    });
    const camera = this.options.scene.cameras.main;
    camera.setBounds(bounds.x, 0, bounds.width, this.options.worldRenderHeight);

    if (duration > 0) {
      camera.pan(frame.centerX, frame.centerY, duration, "Sine.easeInOut");
      camera.zoomTo(frame.zoom, duration);
      return;
    }

    camera.setZoom(frame.zoom);
    camera.centerOn(frame.centerX, frame.centerY);
  }

  recenterForProjectileIfNeeded(projectile: ProjectileState): void {
    const camera = this.options.scene.cameras.main;
    const visibleWorldWidth = camera.width / camera.zoom;
    const visibleWorldHeight = camera.height / camera.zoom;
    const shouldRecenter = shouldRecenterProjectileCamera({
      projectile,
      cameraCenter: {
        x: camera.scrollX + visibleWorldWidth / 2,
        y: camera.scrollY + visibleWorldHeight / 2,
      },
      visibleWorldWidth,
      visibleWorldHeight,
    });

    if (shouldRecenter) {
      camera.centerOn(projectile.x, projectile.y);
    }
  }
}
