import assert from "node:assert/strict";
import test from "node:test";
import type { TerrainCraterSnapshot } from "../onlineLobbySnapshot";
import { OnlineTerrainSync } from "./OnlineTerrainSync";

test("online terrain sync applies each authoritative crater once", () => {
  const applied: TerrainCraterSnapshot[] = [];
  const sync = new OnlineTerrainSync({ applyCrater: (crater) => applied.push(crater) });
  const crater = { x: 500, y: 600, radius: 52, depthFactor: 0.68 };

  assert.equal(sync.apply({ terrainRevision: 2, terrainCraters: [crater] }), true);
  assert.equal(sync.apply({ terrainRevision: 2, terrainCraters: [crater] }), false);
  assert.deepEqual(applied, [crater]);
});

test("online terrain sync replays a reset crater list for a new round", () => {
  const applied: TerrainCraterSnapshot[] = [];
  const sync = new OnlineTerrainSync({ applyCrater: (crater) => applied.push(crater) });
  const first = { x: 500, y: 600, radius: 52, depthFactor: 0.68 };
  const nextRound = { x: 900, y: 500, radius: 82, depthFactor: 1.3 };

  sync.apply({ terrainRevision: 2, terrainCraters: [first] });
  sync.apply({ terrainRevision: 3, terrainCraters: [] });
  sync.apply({ terrainRevision: 4, terrainCraters: [nextRound] });

  assert.deepEqual(applied, [first, nextRound]);
});
