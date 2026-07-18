import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tiledMapToPlayableMap, type TiledMapDocument } from "../shared/content/tiledMapImporter.js";

export type SyncTiledMapsOptions = {
  sourceDir?: string;
  outputDir?: string;
};

export type SyncTiledMapsResult = {
  syncedFiles: string[];
};

const DEFAULT_SOURCE_DIR = path.join("content", "tiled");
const DEFAULT_OUTPUT_DIR = path.join("shared", "content", "maps");

export function syncTiledMaps(options: SyncTiledMapsOptions = {}): SyncTiledMapsResult {
  const sourceDir = options.sourceDir ?? DEFAULT_SOURCE_DIR;
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const sourceFiles = readdirSync(sourceDir)
    .filter((fileName) => fileName.endsWith(".tmj"))
    .sort((left, right) => left.localeCompare(right));
  const syncedFiles: string[] = [];

  mkdirSync(outputDir, { recursive: true });

  for (const fileName of sourceFiles) {
    const sourcePath = path.join(sourceDir, fileName);
    const tiledMap = JSON.parse(readFileSync(sourcePath, "utf8")) as TiledMapDocument;
    const playableMap = tiledMapToPlayableMap(tiledMap);
    const outputPath = path.join(outputDir, `${playableMap.id}.tiled.json`);

    writeFileSync(outputPath, `${JSON.stringify(tiledMap, null, 2)}\n`);
    syncedFiles.push(outputPath);
  }

  return { syncedFiles };
}

function isDirectRun(): boolean {
  return process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
}

if (isDirectRun()) {
  const result = syncTiledMaps();
  for (const filePath of result.syncedFiles) {
    console.log(`Synced ${filePath}`);
  }
}
