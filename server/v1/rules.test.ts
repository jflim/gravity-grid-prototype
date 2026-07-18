import assert from "node:assert/strict";
import test from "node:test";
import { CHARACTER_IDS as SHARED_CHARACTER_IDS } from "../../shared/model/gameTypes.js";
import {
  CHARACTER_IDS,
  DEFAULT_ROOM_SETTINGS,
  MODE_SEATS,
  PHRASE_COOLDOWN_MS,
  TURN_SECONDS,
  mergeRoomSettings,
  sanitizeDisplayName,
  validateRoomSettings,
} from "./rules.js";

test("v1 exposes exactly the locked roster", () => {
  assert.deepEqual(CHARACTER_IDS, ["nova", "vesper", "kaelii", "perlah"]);
  assert.equal(CHARACTER_IDS, SHARED_CHARACTER_IDS);
});

test("v1 supports 1v1 and 2v2 seat layouts", () => {
  assert.equal(MODE_SEATS["1v1"].length, 2);
  assert.equal(MODE_SEATS["2v2"].length, 4);
  assert.deepEqual(MODE_SEATS["2v2"].map((seat) => seat.team), ["red", "blue", "red", "blue"]);
});

test("default room settings match the v1 contract", () => {
  assert.equal(DEFAULT_ROOM_SETTINGS.mode, "2v2");
  assert.equal(DEFAULT_ROOM_SETTINGS.matchLength, "best-of-1");
  assert.equal(DEFAULT_ROOM_SETTINGS.mapPick, "random");
  assert.equal(DEFAULT_ROOM_SETTINGS.friendlyFire, false);
});

test("room settings validation clamps to v1 values", () => {
  assert.deepEqual(
    validateRoomSettings({
      mode: "4v4",
      matchLength: "best-of-9",
      mapPick: "unknown-map",
      friendlyFire: true,
    }),
    {
      mode: "2v2",
      matchLength: "best-of-1",
      mapPick: "random",
      friendlyFire: true,
    },
  );
});

test("room settings patches preserve existing values when fields are omitted or invalid", () => {
  assert.deepEqual(
    mergeRoomSettings(
      {
        mode: "1v1",
        matchLength: "best-of-1",
        mapPick: "ring-basin",
        friendlyFire: false,
      },
      {
        matchLength: "best-of-3",
        mapPick: "not-a-v1-map",
      },
    ),
    {
      mode: "1v1",
      matchLength: "best-of-3",
      mapPick: "ring-basin",
      friendlyFire: false,
    },
  );
});

test("display names are short, visible, and non-persistent", () => {
  assert.equal(sanitizeDisplayName("  Canyon   Pilot!!!  "), "Canyon Pilot");
  assert.equal(sanitizeDisplayName("<script>"), "script");
  assert.equal(sanitizeDisplayName(""), "Guest");
  assert.equal(sanitizeDisplayName("abcdefghijklmnopqrstuvwxyz"), "abcdefghijklmnopqr");
});

test("turn and phrase constants are locked for v1 readability", () => {
  assert.equal(TURN_SECONDS, 20);
  assert.equal(PHRASE_COOLDOWN_MS, 3000);
});
