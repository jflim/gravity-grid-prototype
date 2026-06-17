import assert from "node:assert/strict";
import test from "node:test";
import { tiledMapToPlayableMap } from "./tiledMapImporter.js";

test("converts Tiled surface polylines, spawn points, and callouts into a playable map", () => {
  const map = tiledMapToPlayableMap({
    type: "map",
    width: 150,
    height: 57,
    tilewidth: 16,
    tileheight: 16,
    properties: [
      { name: "gravityCanyon.mapId", type: "string", value: "test-idol" },
      { name: "gravityCanyon.name", type: "string", value: "Test Idol" },
      { name: "gravityCanyon.worldWidth", type: "int", value: 2400 },
      { name: "gravityCanyon.deathPlaneY", type: "int", value: 900 },
      { name: "gravityCanyon.windScale", type: "float", value: 1.05 },
    ],
    layers: [
      {
        type: "objectgroup",
        name: "terrain.surface",
        objects: [
          {
            id: 1,
            name: "main",
            type: "terrainSurface",
            x: 10,
            y: 20,
            polyline: [
              { x: 0, y: 700 },
              { x: 100, y: 600 },
              { x: 200, y: 650 },
            ],
          },
        ],
      },
      {
        type: "objectgroup",
        name: "spawn.points",
        objects: [
          {
            id: 2,
            name: "red-1",
            type: "spawn",
            point: true,
            x: 110,
            y: 620,
            properties: [
              { name: "seatId", type: "string", value: "red-1" },
              { name: "facing", type: "int", value: 1 },
            ],
          },
          {
            id: 3,
            name: "blue-1",
            type: "spawn",
            point: true,
            x: 820,
            y: 670,
            properties: [
              { name: "seatId", type: "string", value: "blue-1" },
              { name: "facing", type: "int", value: -1 },
            ],
          },
          {
            id: 4,
            name: "red-2",
            type: "spawn",
            point: true,
            x: 1310,
            y: 640,
            properties: [
              { name: "seatId", type: "string", value: "red-2" },
              { name: "facing", type: "int", value: 1 },
            ],
          },
          {
            id: 5,
            name: "blue-2",
            type: "spawn",
            point: true,
            x: 1900,
            y: 660,
            properties: [
              { name: "seatId", type: "string", value: "blue-2" },
              { name: "facing", type: "int", value: -1 },
            ],
          },
        ],
      },
      {
        type: "objectgroup",
        name: "callouts",
        objects: [
          {
            id: 4,
            name: "Face Shelf",
            type: "callout",
            x: 60,
            y: 560,
            width: 120,
            height: 40,
          },
        ],
      },
    ],
  });

  assert.equal(map.id, "test-idol");
  assert.equal(map.name, "Test Idol");
  assert.equal(map.worldWidth, 2400);
  assert.equal(map.deathPlaneY, 900);
  assert.equal(map.windScale, 1.05);
  assert.deepEqual(map.previewSegments, [
    [
      { x: 10, y: 720 },
      { x: 110, y: 620 },
      { x: 210, y: 670 },
    ],
  ]);
  assert.deepEqual(map.spawns["red-1"], { x: 110, y: 620, facing: 1 });
  assert.deepEqual(map.spawns["blue-1"], { x: 820, y: 670, facing: -1 });
  assert.deepEqual(map.spawns["red-2"], { x: 1310, y: 640, facing: 1 });
  assert.deepEqual(map.spawns["blue-2"], { x: 1900, y: 660, facing: -1 });
  assert.ok(
    map.landmarks.some((landmark) => landmark.label === "Face Shelf" && landmark.type === "shelf"),
    "callouts become shelf landmarks for visible review",
  );
});

test("rejects Tiled draft maps where any two spawn points are too close", () => {
  assert.throws(
    () =>
      tiledMapToPlayableMap({
        type: "map",
        width: 150,
        height: 57,
        tilewidth: 16,
        tileheight: 16,
        properties: [
          { name: "gravityCanyon.mapId", type: "string", value: "crowded-spawn-test" },
          { name: "gravityCanyon.name", type: "string", value: "Crowded Spawn Test" },
        ],
        layers: [
          {
            type: "objectgroup",
            name: "spawn.points",
            objects: [
              {
                id: 1,
                name: "red-1",
                type: "spawn",
                point: true,
                x: 500,
                y: 700,
                properties: [{ name: "seatId", type: "string", value: "red-1" }],
              },
              {
                id: 2,
                name: "red-2",
                type: "spawn",
                point: true,
                x: 620,
                y: 700,
                properties: [{ name: "seatId", type: "string", value: "red-2" }],
              },
              {
                id: 3,
                name: "blue-1",
                type: "spawn",
                point: true,
                x: 1700,
                y: 700,
                properties: [{ name: "seatId", type: "string", value: "blue-1" }],
              },
              {
                id: 4,
                name: "blue-2",
                type: "spawn",
                point: true,
                x: 2100,
                y: 700,
                properties: [{ name: "seatId", type: "string", value: "blue-2" }],
              },
            ],
          },
        ],
      }),
    /spawn points red-1 and red-2 are too close/i,
  );
});
