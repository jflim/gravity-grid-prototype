import assert from "node:assert/strict";
import test from "node:test";
import { MatchSceneTerrainAdapter } from "./MatchSceneTerrainAdapter";

test("MatchSceneTerrainAdapter routes terrain and void geometry through focused controllers", () => {
  const craterInputs: unknown[] = [];
  const adapter = new MatchSceneTerrainAdapter({
    terrainController: {
      currentMap: undefined,
      visibleVoidTopY: 260,
      surfaceAt: (x) => x + 100,
      terrainAngleAt: (x) => x / 10,
      makeCrater: (input) => {
        craterInputs.push(input);
      },
    },
    voidZoneController: {
      terrainBreakthroughY: (topY) => topY + 20,
      terrainPlatformBottomY: (topY) => topY + 40,
      visibleVoidBottomY: (topY) => topY + 240,
      voidDropTargetY: (topY) => topY + 200,
    },
  });

  assert.equal(adapter.surfaceAt(12), 112);
  assert.equal(adapter.terrainAngleAt(30), 3);
  assert.equal(adapter.terrainBreakthroughY(), 280);
  assert.equal(adapter.terrainPlatformBottomY(), 300);
  assert.equal(adapter.visibleVoidBottomY(), 500);
  assert.equal(adapter.voidDropTargetY(), 460);

  adapter.makeCrater(10, 20, 30, 0.5);
  assert.deepEqual(craterInputs, [
    {
      x: 10,
      y: 20,
      radius: 30,
      depthFactor: 0.5,
      breakthroughY: 280,
    },
  ]);
});
