import assert from "node:assert/strict";
import test from "node:test";
import { MAPS, pickMap, spawnForSeat } from "./maps.js";
import { MODE_SEATS } from "./rules.js";

test("v1 map pool has five selectable maps", () => {
  assert.deepEqual(
    MAPS.map((map) => map.id),
    ["mesa-ribs", "split-arch", "crater-steps", "wind-bridge", "basin-ridge"],
  );
});

test("each map has valid spawns for 1v1 and 2v2 seats", () => {
  for (const map of MAPS) {
    for (const mode of ["1v1", "2v2"] as const) {
      for (const seat of MODE_SEATS[mode]) {
        const spawn = spawnForSeat(map, seat.seatId);
        assert.ok(spawn.x > 0 && spawn.x < map.worldWidth, `${map.id} ${seat.seatId} x is playable`);
        assert.ok(spawn.y > map.deathPlaneY - 900 && spawn.y < map.deathPlaneY, `${map.id} ${seat.seatId} y is safe`);
      }
    }
  }
});

test("random map selection is deterministic by seed", () => {
  assert.equal(pickMap("random", 1001).id, pickMap("random", 1001).id);
  assert.equal(pickMap("random", 1002).id, pickMap("random", 1002).id);
});

test("explicit map selection wins over random", () => {
  assert.equal(pickMap("split-arch", 1001).id, "split-arch");
});

test("map preview surfaces are drawable from left to right", () => {
  for (const map of MAPS) {
    assert.equal(map.previewSurface[0].x, 0, `${map.id} preview starts at world edge`);
    assert.equal(map.previewSurface.at(-1)?.x, map.worldWidth, `${map.id} preview ends at world edge`);

    for (let index = 1; index < map.previewSurface.length; index += 1) {
      const previous = map.previewSurface[index - 1];
      const current = map.previewSurface[index];
      assert.ok(current.x > previous.x, `${map.id} preview points move left to right`);
      assert.ok(current.y < map.deathPlaneY, `${map.id} preview stays above death plane`);
    }
  }
});
