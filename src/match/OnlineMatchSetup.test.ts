import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TERRAIN_BREAKTHROUGH_Y,
  MAX_HP,
  MAX_MOVE_UNITS,
  V1_WORLD_WIDTH,
  VOID_SURFACE_Y,
} from "../../shared/v1/tuning.js";
import { buildPlayableTerrain, playableMapById } from "../playableMaps";
import { previewRoomSnapshot } from "../onlineGameplayPreviewTestData";
import { RoundBuilder } from "./RoundBuilder";
import { matchSceneRoundSetupFromSnapshot } from "./OnlineMatchSetup";

test("online match setup maps server vehicles into Phaser units by seat and character", () => {
  const setup = matchSceneRoundSetupFromSnapshot({
    ...previewRoomSnapshot(),
    selectedMapId: "bridgeworks",
    selectedMapName: "Bridgeworks",
    targetScore: 2,
    turnSequence: ["red-1", "blue-1"],
    vehicles: [
      {
        ...previewRoomSnapshot().vehicles[1]!,
        vehicleId: "blue-1",
        seatId: "blue-1",
        characterId: "perlah",
        team: "blue",
      },
      {
        ...previewRoomSnapshot().vehicles[0]!,
        vehicleId: "red-1",
        seatId: "red-1",
        characterId: "kaelii",
        team: "red",
      },
    ],
  });

  assert.ok(setup, "setup exists once the server publishes map and vehicles");
  assert.equal(setup.mapId, "bridgeworks");
  assert.equal(setup.roundStartText, "Online round started: Bridgeworks. First to 2. Red / Nova is up: 20s.");
  assert.deepEqual(
    setup.units.map((unit) => ({
      id: unit.id,
      characterId: unit.characterId,
      username: unit.username,
      team: unit.team,
    })),
    [
      { id: "red-1", characterId: "kaelii", username: "Kaelii", team: "red" },
      { id: "blue-1", characterId: "perlah", username: "Perlah", team: "blue" },
    ],
  );
});

test("online match setup starts the local Phaser round on the server-selected map spawns", () => {
  const setup = matchSceneRoundSetupFromSnapshot({
    ...previewRoomSnapshot(),
    selectedMapId: "bridgeworks",
    selectedMapName: "Bridgeworks",
    targetScore: 2,
    turnSequence: ["red-1", "blue-1"],
    vehicles: [
      {
        ...previewRoomSnapshot().vehicles[0]!,
        characterId: "kaelii",
      },
      {
        ...previewRoomSnapshot().vehicles[1]!,
        characterId: "perlah",
      },
    ],
  });
  assert.ok(setup, "setup exists once the server publishes map and vehicles");

  const builder = new RoundBuilder({
    maxHp: MAX_HP,
    maxMoveUnits: MAX_MOVE_UNITS,
    worldWidth: V1_WORLD_WIDTH,
    spawnFlattenWidth: 150,
    defaultTerrainBreakthroughY: DEFAULT_TERRAIN_BREAKTHROUGH_Y,
    fallbackVisibleVoidTopY: 660,
  });
  const playableTerrain = buildPlayableTerrain(playableMapById(setup.mapId), {
    voidSurfaceY: VOID_SURFACE_Y,
  });
  const round = builder.build({
    playableTerrain,
    units: setup.units,
  });

  assert.deepEqual(round.turnOrder, ["red-1", "blue-1"]);
  const redVehicle = round.vehicles[0];
  const blueVehicle = round.vehicles[1];
  assert.ok(redVehicle, "red vehicle exists");
  assert.ok(blueVehicle, "blue vehicle exists");
  assert.equal(redVehicle.characterId, "kaelii");
  assert.equal(redVehicle.x, 370);
  assert.equal(redVehicle.angle, 47);
  assert.equal(blueVehicle.characterId, "perlah");
  assert.equal(blueVehicle.x, 2030);
  assert.equal(blueVehicle.angle, 133);
});

test("online match setup waits for server-published setup metadata", () => {
  assert.equal(
    matchSceneRoundSetupFromSnapshot({
      ...previewRoomSnapshot(),
      selectedMapId: "",
      vehicles: [],
    }),
    undefined,
  );
});
