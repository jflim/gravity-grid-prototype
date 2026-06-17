import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

interface UnitNormalization {
  name: string;
  state: "default" | "intense";
  sourcePath: string;
  runtimePath: string;
  variantPath: string;
  canvas: {
    width: number;
    height: number;
  };
  visibleFit: {
    width: number;
    height: number;
  };
}

const root = process.cwd();
const alphaThreshold = 8;
const bottomPadRatio = 0.035;

const units: UnitNormalization[] = [
  {
    name: "Nova",
    state: "default",
    sourcePath:
      "public/assets/sprite-variants/units/nova/default/nova-unit-default-duo-contrast-v2-alpha.png",
    runtimePath: "public/assets/nova-unit-default.png",
    variantPath:
      "public/assets/sprite-variants/units/nova/default/nova-unit-default-duo-contrast-v2-battlefield-normalized.png",
    canvas: { width: 1400, height: 932 },
    visibleFit: { width: 1316, height: 838 },
  },
  {
    name: "Nova",
    state: "intense",
    sourcePath:
      "public/assets/sprite-variants/units/nova/intense/nova-unit-intense-bunger-rig-probe-01-alpha.png",
    runtimePath: "public/assets/nova-unit-intense.png",
    variantPath:
      "public/assets/sprite-variants/units/nova/intense/nova-unit-intense-battlefield-normalized.png",
    canvas: { width: 1400, height: 932 },
    visibleFit: { width: 1316, height: 838 },
  },
  {
    name: "Vesper",
    state: "default",
    sourcePath:
      "public/assets/sprite-variants/units/vesper/default/vesper-unit-default-face-first-v2-alpha.png",
    runtimePath: "public/assets/vesper-unit-default.png",
    variantPath:
      "public/assets/sprite-variants/units/vesper/default/vesper-unit-default-battlefield-normalized.png",
    canvas: { width: 1424, height: 832 },
    visibleFit: { width: 1338, height: 749 },
  },
  {
    name: "Vesper",
    state: "intense",
    sourcePath:
      "public/assets/sprite-variants/units/vesper/intense/vesper-unit-intense-glitch-rover-probe-08-subtle-tension-scale-stable-normalized-alpha.png",
    runtimePath: "public/assets/vesper-unit-intense.png",
    variantPath:
      "public/assets/sprite-variants/units/vesper/intense/vesper-unit-intense-battlefield-normalized.png",
    canvas: { width: 1424, height: 832 },
    visibleFit: { width: 1338, height: 749 },
  },
  {
    name: "Kaelii",
    state: "default",
    sourcePath:
      "public/assets/sprite-variants/units/kaelii/default/kaelii-unit-default-face-first-v2-alpha.png",
    runtimePath: "public/assets/kaelii-unit-default.png",
    variantPath:
      "public/assets/sprite-variants/units/kaelii/default/kaelii-unit-default-battlefield-normalized.png",
    canvas: { width: 1424, height: 832 },
    visibleFit: { width: 1338, height: 749 },
  },
  {
    name: "Kaelii",
    state: "intense",
    sourcePath:
      "public/assets/sprite-variants/units/kaelii/intense/kaelii-unit-intense-flashkick-skip-rig-probe-05-animation-linked-alpha.png",
    runtimePath: "public/assets/kaelii-unit-intense.png",
    variantPath:
      "public/assets/sprite-variants/units/kaelii/intense/kaelii-unit-intense-battlefield-normalized.png",
    canvas: { width: 1424, height: 832 },
    visibleFit: { width: 1338, height: 749 },
  },
  {
    name: "Perlah",
    state: "default",
    sourcePath:
      "public/assets/sprite-variants/units/perlah/default/perlah-unit-default-face-first-v2-alpha.png",
    runtimePath: "public/assets/perlah-unit-default.png",
    variantPath:
      "public/assets/sprite-variants/units/perlah/default/perlah-unit-default-battlefield-normalized.png",
    canvas: { width: 1424, height: 832 },
    visibleFit: { width: 1338, height: 749 },
  },
  {
    name: "Perlah",
    state: "intense",
    sourcePath:
      "public/assets/sprite-variants/units/perlah/intense/perlah-unit-intense-face-first-v4-alpha.png",
    runtimePath: "public/assets/perlah-unit-intense.png",
    variantPath:
      "public/assets/sprite-variants/units/perlah/intense/perlah-unit-intense-battlefield-normalized.png",
    canvas: { width: 1424, height: 832 },
    visibleFit: { width: 1338, height: 749 },
  },
];

interface AlphaBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

async function readAlphaBounds(sourcePath: string): Promise<AlphaBounds> {
  const image = sharp(join(root, sourcePath)).ensureAlpha();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`${sourcePath} has no readable dimensions`);
  }

  const alpha = await image.extractChannel("alpha").raw().toBuffer();
  let minX = metadata.width;
  let minY = metadata.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < metadata.height; y += 1) {
    for (let x = 0; x < metadata.width; x += 1) {
      if (alpha[y * metadata.width + x] > alphaThreshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(`${sourcePath} has no visible alpha bounds`);
  }

  return {
    left: minX,
    top: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function normalizeUnit(unit: UnitNormalization): Promise<void> {
  const bounds = await readAlphaBounds(unit.sourcePath);
  const trimmed = await sharp(join(root, unit.sourcePath))
    .ensureAlpha()
    .extract({
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
    .resize({
      width: unit.visibleFit.width,
      height: unit.visibleFit.height,
      fit: "inside",
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  const resizedMetadata = await sharp(trimmed).metadata();
  if (!resizedMetadata.width || !resizedMetadata.height) {
    throw new Error(`${unit.name} normalized buffer has no readable dimensions`);
  }

  const bottomPad = Math.round(unit.canvas.height * bottomPadRatio);
  const left = Math.round((unit.canvas.width - resizedMetadata.width) / 2);
  const top = unit.canvas.height - bottomPad - resizedMetadata.height;
  const output = await sharp({
    create: {
      width: unit.canvas.width,
      height: unit.canvas.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, left, top }])
    .png()
    .toBuffer();

  for (const targetPath of [unit.runtimePath, unit.variantPath]) {
    const absoluteTarget = join(root, targetPath);
    await mkdir(dirname(absoluteTarget), { recursive: true });
    await writeFile(absoluteTarget, output);
  }

  console.log(
    `${unit.name} ${unit.state}: ${unit.sourcePath} -> ${unit.runtimePath} (${unit.canvas.width}x${unit.canvas.height})`,
  );
}

for (const unit of units) {
  await normalizeUnit(unit);
}
