import { mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import {
  CONCEPT_IMAGE_ASSETS,
  RUNTIME_IMAGE_ASSETS,
  STYLE_REFERENCE_ASSET,
} from "../src/runtimeAssets";

const WEBP_QUALITY = 88;
const WEBP_ALPHA_QUALITY = 95;
const WEBP_EFFORT = 6;

const assetPaths = [
  STYLE_REFERENCE_ASSET,
  ...Object.values(RUNTIME_IMAGE_ASSETS),
  ...Object.values(CONCEPT_IMAGE_ASSETS),
];

let sourceBytes = 0;
let optimizedBytes = 0;

for (const targetAssetPath of assetPaths) {
  const sourceAssetPath = targetAssetPath.replace(/\.webp$/, ".png");
  const sourcePath = join(process.cwd(), "public", sourceAssetPath);
  const targetPath = join(process.cwd(), "public", targetAssetPath);

  await mkdir(dirname(targetPath), { recursive: true });
  const before = (await stat(sourcePath)).size;

  await sharp(sourcePath)
    .webp({
      quality: WEBP_QUALITY,
      alphaQuality: WEBP_ALPHA_QUALITY,
      effort: WEBP_EFFORT,
    })
    .toFile(targetPath);

  const after = (await stat(targetPath)).size;
  sourceBytes += before;
  optimizedBytes += after;
  console.log(`${sourceAssetPath}: ${before} -> ${after}`);
}

const percent = sourceBytes > 0 ? ((optimizedBytes / sourceBytes) * 100).toFixed(1) : "0.0";
console.log(`Optimized runtime art: ${sourceBytes} -> ${optimizedBytes} bytes (${percent}%).`);
