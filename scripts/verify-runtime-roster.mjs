import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

const root = process.cwd();
const mainSource = readFileSync(join(root, "src", "main.ts"), "utf8");

const runtimeUnits = [
  {
    name: "Nova",
    keys: [
      "nova-vehicle",
      "nova-vehicle-sprite",
      "nova-vehicle-destroyed",
      "nova-character-default",
      "nova-character-ko",
      "nova-character-intense",
      "nova-unit-intense",
    ],
    files: [
      "public/assets/nova-vehicle.png",
      "public/assets/nova-vehicle-sprite.png",
      "public/assets/nova-vehicle-destroyed.png",
      "public/assets/nova-character-default.png",
      "public/assets/nova-character-ko.png",
      "public/assets/nova-character-intense.png",
      "public/assets/nova-unit-intense.png",
    ],
  },
  {
    name: "Vesper",
    keys: [
      "vesper-vehicle",
      "vesper-vehicle-sprite",
      "vesper-vehicle-destroyed",
      "vesper-character-default",
      "vesper-character-ko",
      "vesper-character-intense",
      "vesper-unit-intense",
    ],
    files: [
      "public/assets/vesper-vehicle.png",
      "public/assets/vesper-vehicle-sprite.png",
      "public/assets/vesper-vehicle-destroyed.png",
      "public/assets/vesper-character-default.png",
      "public/assets/vesper-character-ko.png",
      "public/assets/vesper-character-intense.png",
      "public/assets/vesper-unit-intense.png",
    ],
  },
  {
    name: "Kaelii",
    keys: [
      "kaelii-vehicle-sprite",
      "kaelii-vehicle-destroyed",
      "kaelii-unit-default",
      "kaelii-unit-intense",
      "kaelii-unit-ko",
    ],
    files: [
      "public/assets/kaelii-vehicle-sprite.png",
      "public/assets/kaelii-vehicle-destroyed.png",
      "public/assets/kaelii-unit-default.png",
      "public/assets/kaelii-unit-intense.png",
      "public/assets/kaelii-unit-ko.png",
    ],
  },
  {
    name: "Perlah",
    keys: [
      "perlah-vehicle-sprite",
      "perlah-vehicle-destroyed",
      "perlah-unit-default",
      "perlah-unit-intense",
      "perlah-unit-ko",
    ],
    files: [
      "public/assets/perlah-vehicle-sprite.png",
      "public/assets/perlah-vehicle-destroyed.png",
      "public/assets/perlah-unit-default.png",
      "public/assets/perlah-unit-intense.png",
      "public/assets/perlah-unit-ko.png",
    ],
  },
];

const failures = [];

for (const unit of runtimeUnits) {
  if (!mainSource.includes(`username: "${unit.name}"`)) {
    failures.push(`missing local roster entry for ${unit.name}`);
  }

  for (const key of unit.keys) {
    if (!mainSource.includes(`"${key}"`)) {
      failures.push(`missing preload or roster key ${key}`);
    }
  }

  for (const file of unit.files) {
    if (!existsSync(join(root, file))) {
      failures.push(`missing runtime asset ${file}`);
    }
  }
}

if (!mainSource.includes('type ClassId = "bunger" | "glitch" | "bouncer" | "spark";')) {
  failures.push("ClassId does not include bouncer and spark");
}

if (!mainSource.includes('this.turnOrder = ["red-1", "blue-1", "red-2", "blue-2"];')) {
  failures.push("local turn order does not include Kaelii and Perlah test units");
}

const expectedRuntimeTuning = [
  'default: { width: 350, height: 233 }',
  'intense: { width: 350, height: 233 }',
  'default: { width: 356, height: 208 }',
  'intense: { width: 356, height: 208 }',
  'ko: { width: 354, height: 212 }',
  "const USE_UNIT_CONCEPT_PREVIEW = shouldUseConceptPreviewAssets(window.location.search);",
  "const USE_STYLE_REFERENCE_BACKGROUND = shouldUseStyleReferenceBackground(window.location.search);",
  "combatHull: SHARED_V1_VEHICLE_HIT_ZONE",
  "const yOffset = USE_UNIT_CONCEPT_PREVIEW ? 176 : 104;",
];

for (const snippet of expectedRuntimeTuning) {
  if (!mainSource.includes(snippet)) {
    failures.push(`missing runtime tuning snippet: ${snippet}`);
  }
}

function paethPredictor(left, up, upLeft) {
  const prediction = left + up - upLeft;
  const distanceLeft = Math.abs(prediction - left);
  const distanceUp = Math.abs(prediction - up);
  const distanceUpLeft = Math.abs(prediction - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) {
    return left;
  }
  return distanceUp <= distanceUpLeft ? up : upLeft;
}

function readPngAlphaBounds(file) {
  const buffer = readFileSync(join(root, file));
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`${file} is not a PNG`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 4 && colorType !== 2)) {
    throw new Error(`${file} uses unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const channels = colorType === 6 ? 4 : colorType === 4 ? 2 : 3;
  const bytesPerPixel = channels;
  const scanlineLength = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const previous = Buffer.alloc(scanlineLength);
  const current = Buffer.alloc(scanlineLength);
  let sourceOffset = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    inflated.copy(current, 0, sourceOffset, sourceOffset + scanlineLength);
    sourceOffset += scanlineLength;

    for (let x = 0; x < scanlineLength; x += 1) {
      const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 1) {
        current[x] = (current[x] + left) & 0xff;
      } else if (filter === 2) {
        current[x] = (current[x] + up) & 0xff;
      } else if (filter === 3) {
        current[x] = (current[x] + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        current[x] = (current[x] + paethPredictor(left, up, upLeft)) & 0xff;
      } else if (filter !== 0) {
        throw new Error(`${file} uses unsupported PNG filter ${filter}`);
      }
    }

    for (let x = 0; x < width; x += 1) {
      const alpha = colorType === 2 ? 255 : current[x * bytesPerPixel + bytesPerPixel - 1];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    previous.set(current);
  }

  if (maxX < minX || maxY < minY) {
    throw new Error(`${file} has no visible alpha bounds`);
  }

  return {
    width,
    height,
    visibleWidth: maxX - minX + 1,
    visibleHeight: maxY - minY + 1,
  };
}

function assertAnimationLinkedFootprint(name, defaultFile, intenseFile) {
  const defaultBounds = readPngAlphaBounds(defaultFile);
  const intenseBounds = readPngAlphaBounds(intenseFile);
  const widthRatio =
    (intenseBounds.visibleWidth / intenseBounds.width) / (defaultBounds.visibleWidth / defaultBounds.width);
  const heightRatio =
    (intenseBounds.visibleHeight / intenseBounds.height) / (defaultBounds.visibleHeight / defaultBounds.height);
  const minRatio = 0.94;
  const maxRatio = 1.06;

  if (widthRatio < minRatio || widthRatio > maxRatio || heightRatio < minRatio || heightRatio > maxRatio) {
    failures.push(
      `${name} intense visible footprint drifted from default: width ratio ${widthRatio.toFixed(
        3,
      )}, height ratio ${heightRatio.toFixed(3)}`,
    );
  }
}

assertAnimationLinkedFootprint(
  "Vesper",
  "public/assets/sprite-variants/units/vesper/default/vesper-unit-default-mounted-tech-shorts-v9-alpha.png",
  "public/assets/vesper-unit-intense.png",
);
assertAnimationLinkedFootprint(
  "Perlah",
  "public/assets/perlah-unit-default.png",
  "public/assets/perlah-unit-intense.png",
);

if (failures.length > 0) {
  console.error("Runtime roster verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Runtime roster verification passed.");
