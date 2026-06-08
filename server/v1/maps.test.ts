import assert from "node:assert/strict";
import test from "node:test";
import { MAPS, pickMap, spawnForSeat } from "./maps.js";
import { MODE_SEATS } from "./rules.js";

test("v1 map pool has five selectable maps", () => {
  assert.deepEqual(
    MAPS.map((map) => map.id),
    ["canyon-terraces", "split-ravine", "needlefield", "ring-basin", "bridgeworks"],
  );
  assert.deepEqual(
    MAPS.map((map) => map.name),
    ["Canyon Terraces", "Split Ravine", "Needlefield", "Ring Basin", "Bridgeworks"],
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
  assert.equal(pickMap("split-ravine", 1001).id, "split-ravine");
});

test("map preview terrain segments are drawable from left to right", () => {
  for (const map of MAPS) {
    assert.ok(map.previewSegments.length >= 1, `${map.id} has at least one land segment`);

    for (const segment of map.previewSegments) {
      assert.ok(segment.length >= 2, `${map.id} segment has drawable endpoints`);
      for (let index = 1; index < segment.length; index += 1) {
        const previous = segment[index - 1];
        const current = segment[index];
        assert.ok(current.x > previous.x, `${map.id} segment points move left to right`);
        assert.ok(current.y < map.deathPlaneY, `${map.id} segment stays above death plane`);
      }
    }
  }
});

test("v1 maps have multi-tier terrain instead of rolling hills", () => {
  for (const map of MAPS) {
    const tiers = new Set(
      map.previewSegments
        .flat()
        .map((point) => {
          if (point.y <= 600) {
            return "high";
          }
          if (point.y <= 700) {
            return "mid";
          }
          return "low";
        }),
    );

    assert.deepEqual([...tiers].sort(), ["high", "low", "mid"], `${map.id} uses high, mid, and low tiers`);
  }
});

test("map pool includes gaps and canyon landmarks", () => {
  const gapMaps = MAPS.filter((map) => map.previewSegments.length > 1).map((map) => map.id);
  assert.ok(gapMaps.includes("split-ravine"), "Split Ravine has broken land");
  assert.ok(gapMaps.includes("needlefield"), "Needlefield has broken land");
  assert.ok(gapMaps.includes("bridgeworks"), "Bridgeworks has broken land");

  for (const map of MAPS) {
    assert.ok(map.landmarks.length > 0, `${map.id} has visible canyon landmarks`);
  }

  const landmarkTypes = new Set(MAPS.flatMap((map) => map.landmarks.map((landmark) => landmark.type)));
  assert.ok(landmarkTypes.has("spire"), "map pool has canyon spires");
  assert.ok(landmarkTypes.has("arch"), "map pool has canyon arches");
  assert.ok(landmarkTypes.has("ring"), "map pool has circular ring forms");
  assert.ok(landmarkTypes.has("bridge"), "map pool has bridge forms");
});

test("ring and bridge maps have distinct novelty hooks", () => {
  const ringBasin = MAPS.find((map) => map.id === "ring-basin");
  const bridgeworks = MAPS.find((map) => map.id === "bridgeworks");

  assert.ok(ringBasin, "Ring Basin exists");
  assert.ok(bridgeworks, "Bridgeworks exists");
  assert.ok(ringBasin.landmarks.filter((landmark) => landmark.type === "ring").length >= 2, "Ring Basin has multiple circular forms");
  assert.ok(bridgeworks.landmarks.filter((landmark) => landmark.type === "bridge").length >= 3, "Bridgeworks has many bridges");
  assert.ok(bridgeworks.previewSegments.length >= 5, "Bridgeworks uses many separated land spans");
});

test("Ring Basin uses separated playable spans instead of relying on circle overlays", () => {
  const ringBasin = MAPS.find((map) => map.id === "ring-basin");
  assert.ok(ringBasin, "Ring Basin exists");
  assert.ok(ringBasin.previewSegments.length >= 5, "Ring Basin has broken basin spans");

  const gaps = ringBasin.previewSegments.slice(1).filter((segment, index) => {
    const previous = ringBasin.previewSegments[index];
    return segment[0].x - previous[previous.length - 1].x >= 48;
  });

  assert.ok(gaps.length >= 4, "Ring Basin has visible air gaps between terrain spans");
  assert.ok(
    ringBasin.previewSegments.some((segment) =>
      segment.some((point) => point.x >= 1120 && point.x <= 1280 && point.y >= 790),
    ),
    "Ring Basin has a low central basin span",
  );
});

test("each multi-tier map shows uphill and downhill shot lanes", () => {
  for (const map of MAPS) {
    assert.equal(map.tierShots.length, 2, `${map.id} has one uphill and one downhill example`);
    assert.deepEqual(
      map.tierShots.map((shot) => shot.direction).sort(),
      ["downhill", "uphill"],
      `${map.id} labels both vertical shot reads`,
    );

    for (const shot of map.tierShots) {
      const from = spawnForSeat(map, shot.from);
      const to = spawnForSeat(map, shot.to);
      const verticalDelta = to.y - from.y;

      if (shot.direction === "uphill") {
        assert.ok(verticalDelta <= -70, `${map.id} uphill shot target is meaningfully above shooter`);
      } else {
        assert.ok(verticalDelta >= 70, `${map.id} downhill shot target is meaningfully below shooter`);
      }
    }
  }
});
