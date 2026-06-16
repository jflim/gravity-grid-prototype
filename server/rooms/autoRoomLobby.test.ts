import assert from "node:assert/strict";
import test from "node:test";
import {
  activeSlotIdsForMode,
  assignCaptainRoles,
  canEditSlot,
  defaultCharacterForSlot,
  isReadyToAutoStart,
  ownerSessionIdForSlot,
  sanitizeCharacterPick,
} from "./autoRoomLobby.js";

const players = [
  { sessionId: "red-session", joinOrder: 1, ready: false },
  { sessionId: "blue-session", joinOrder: 2, ready: false },
  { sessionId: "spectator-session", joinOrder: 3, ready: false },
];

test("assignCaptainRoles makes the first player red, second blue, and extras spectators", () => {
  const roles = assignCaptainRoles(players);

  assert.equal(roles.get("red-session"), "red-captain");
  assert.equal(roles.get("blue-session"), "blue-captain");
  assert.equal(roles.get("spectator-session"), "spectator");
});

test("assignCaptainRoles promotes the earliest remaining spectator when a captain leaves", () => {
  const roles = assignCaptainRoles([
    { sessionId: "blue-session", joinOrder: 2, ready: false },
    { sessionId: "spectator-session", joinOrder: 3, ready: false },
  ]);

  assert.equal(roles.get("blue-session"), "red-captain");
  assert.equal(roles.get("spectator-session"), "blue-captain");
});

test("activeSlotIdsForMode exposes one unit per team in 1v1 and two per team in 2v2", () => {
  assert.deepEqual(activeSlotIdsForMode("1v1"), ["red-1", "blue-1"]);
  assert.deepEqual(activeSlotIdsForMode("2v2"), ["red-1", "blue-1", "red-2", "blue-2"]);
});

test("captains can edit only their own team slots", () => {
  assert.equal(canEditSlot("red-captain", "red-1"), true);
  assert.equal(canEditSlot("red-captain", "blue-1"), false);
  assert.equal(canEditSlot("blue-captain", "blue-2"), true);
  assert.equal(canEditSlot("blue-captain", "red-2"), false);
  assert.equal(canEditSlot("spectator", "red-1"), false);
});

test("ownerSessionIdForSlot maps every active slot to its team captain", () => {
  assert.equal(ownerSessionIdForSlot("red-1", "red-session", "blue-session"), "red-session");
  assert.equal(ownerSessionIdForSlot("red-2", "red-session", "blue-session"), "red-session");
  assert.equal(ownerSessionIdForSlot("blue-1", "red-session", "blue-session"), "blue-session");
  assert.equal(ownerSessionIdForSlot("blue-2", "red-session", "blue-session"), "blue-session");
});

test("defaultCharacterForSlot preserves the two-captain 2v2 test roster", () => {
  assert.equal(defaultCharacterForSlot("red-1"), "nova");
  assert.equal(defaultCharacterForSlot("red-2"), "kaelii");
  assert.equal(defaultCharacterForSlot("blue-1"), "vesper");
  assert.equal(defaultCharacterForSlot("blue-2"), "perlah");
});

test("sanitizeCharacterPick keeps valid roster picks and falls back per slot", () => {
  assert.equal(sanitizeCharacterPick("vesper", "red-1"), "vesper");
  assert.equal(sanitizeCharacterPick("not-real", "red-1"), "nova");
  assert.equal(sanitizeCharacterPick(undefined, "blue-2"), "perlah");
});

test("isReadyToAutoStart requires both captains ready and valid active slot picks", () => {
  assert.equal(
    isReadyToAutoStart({
      mode: "2v2",
      redCaptainSessionId: "red-session",
      blueCaptainSessionId: "blue-session",
      redReady: true,
      blueReady: false,
      selectedCharacters: {
        "red-1": "nova",
        "blue-1": "vesper",
        "red-2": "kaelii",
        "blue-2": "perlah",
      },
    }),
    false,
  );

  assert.equal(
    isReadyToAutoStart({
      mode: "2v2",
      redCaptainSessionId: "red-session",
      blueCaptainSessionId: "blue-session",
      redReady: true,
      blueReady: true,
      selectedCharacters: {
        "red-1": "nova",
        "blue-1": "vesper",
        "red-2": "kaelii",
        "blue-2": "perlah",
      },
    }),
    true,
  );

  assert.equal(
    isReadyToAutoStart({
      mode: "2v2",
      redCaptainSessionId: "red-session",
      blueCaptainSessionId: "blue-session",
      redReady: true,
      blueReady: true,
      selectedCharacters: {
        "red-1": "nova",
        "blue-1": "vesper",
        "red-2": "not-real",
        "blue-2": "perlah",
      },
    }),
    false,
  );
});
