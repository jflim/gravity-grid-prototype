import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { syncTiledMaps } from "./sync-tiled-maps.js";

test("maps:sync is the committed Tiled authoring pipeline", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(packageJson.scripts?.["maps:sync"], "tsx scripts/sync-tiled-maps.ts");
  assert.ok(existsSync("content/tiled/idol-canyon-supine-draft.tmj"), "tracked Tiled source map exists");
});

test("syncTiledMaps copies source tmj files into runtime tiled json files", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "gravity-canyon-tiled-sync-"));
  const sourceDir = path.join(tempRoot, "content", "tiled");
  const outputDir = path.join(tempRoot, "shared", "content", "maps");

  try {
    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(sourceDir, "test-draft.tmj"), JSON.stringify(tiledFixture(), null, 2));

    const result = syncTiledMaps({ sourceDir, outputDir });

    assert.deepEqual(result.syncedFiles, [path.join(outputDir, "test-draft.tiled.json")]);
    const synced = JSON.parse(readFileSync(path.join(outputDir, "test-draft.tiled.json"), "utf8")) as {
      properties?: Array<{ name: string; value: string | number | boolean }>;
    };
    assert.equal(
      synced.properties?.find((property) => property.name === "gravityCanyon.mapId")?.value,
      "test-draft",
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

function tiledFixture() {
  return {
    type: "map",
    width: 150,
    height: 57,
    tilewidth: 16,
    tileheight: 16,
    properties: [
      { name: "gravityCanyon.mapId", type: "string", value: "test-draft" },
      { name: "gravityCanyon.name", type: "string", value: "Test Draft" },
    ],
    layers: [
      {
        type: "objectgroup",
        name: "spawn.points",
        objects: [
          spawn(1, "red-1", 260, 720, 1),
          spawn(2, "red-2", 820, 560, 1),
          spawn(3, "blue-1", 1600, 560, -1),
          spawn(4, "blue-2", 2140, 720, -1),
        ],
      },
    ],
  };
}

function spawn(id: number, seatId: string, x: number, y: number, facing: 1 | -1) {
  return {
    id,
    name: seatId,
    type: "spawn",
    point: true,
    x,
    y,
    properties: [
      { name: "seatId", type: "string", value: seatId },
      { name: "facing", type: "int", value: facing },
    ],
  };
}
