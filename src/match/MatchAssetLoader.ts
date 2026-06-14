import Phaser from "phaser";
import {
  CONCEPT_IMAGE_ASSETS,
  RUNTIME_IMAGE_ASSETS,
  STYLE_REFERENCE_ASSET,
} from "../runtimeAssets";

export interface ImageAsset {
  key: string;
  path: string;
}

export interface MatchAssetLoadPlan {
  runtimeImages: ImageAsset[];
  conceptImages: ImageAsset[];
  styleReference?: ImageAsset;
}

export interface MatchAssetLoadPlanInput {
  includeConceptPreviewAssets: boolean;
  includeStyleReferenceBackground: boolean;
}

export interface MatchAssetLoaderOptions {
  scene: Phaser.Scene;
  plan: MatchAssetLoadPlan;
}

export function buildMatchAssetLoadPlan(input: MatchAssetLoadPlanInput): MatchAssetLoadPlan {
  return {
    runtimeImages: entriesFor(RUNTIME_IMAGE_ASSETS),
    conceptImages: input.includeConceptPreviewAssets ? entriesFor(CONCEPT_IMAGE_ASSETS) : [],
    styleReference: input.includeStyleReferenceBackground
      ? { key: "style-reference", path: STYLE_REFERENCE_ASSET }
      : undefined,
  };
}

export class MatchAssetLoader {
  private preloadStatusText?: Phaser.GameObjects.Text;
  private preloadFailed = false;

  constructor(private readonly options: MatchAssetLoaderOptions) {}

  preload(): void {
    this.mountPreloadStatus();

    if (this.options.plan.styleReference) {
      this.options.scene.load.image(
        this.options.plan.styleReference.key,
        this.options.plan.styleReference.path,
      );
    }

    for (const asset of this.options.plan.runtimeImages) {
      this.options.scene.load.image(asset.key, asset.path);
    }

    for (const asset of this.options.plan.conceptImages) {
      this.options.scene.load.image(asset.key, asset.path);
    }
  }

  private mountPreloadStatus(): void {
    this.preloadFailed = false;
    const scene = this.options.scene;
    this.preloadStatusText = scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2, "Loading Gravity Canyon 0%", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "24px",
        fontStyle: "700",
        color: "#9ee8ff",
        align: "center",
        stroke: "#07111f",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10000);

    scene.load.on("progress", (progress: number) => {
      if (!this.preloadStatusText || this.preloadFailed) {
        return;
      }

      this.preloadStatusText.setText(`Loading Gravity Canyon ${Math.round(progress * 100)}%`);
    });

    scene.load.on("loaderror", (file: { key: string }) => {
      this.preloadFailed = true;
      this.preloadStatusText?.setText(`Could not load ${file.key}`);
    });

    scene.load.once("complete", () => {
      if (!this.preloadFailed) {
        this.preloadStatusText?.destroy();
        this.preloadStatusText = undefined;
      }
    });
  }
}

function entriesFor(assets: Record<string, string>): ImageAsset[] {
  return Object.entries(assets).map(([key, path]) => ({ key, path }));
}
