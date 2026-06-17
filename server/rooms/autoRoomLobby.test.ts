import assert from "node:assert/strict";
import test from "node:test";
import {
  activeSlotIdsForMode,
  assignLobbyRoles,
  buildPreviewSlots,
  canEditSlot,
  defaultCharacterForSlot,
  isReadyToAutoStart,
  sanitizeCharacterPick,
} from "./autoRoomLobby.js";
import { GravityCanyonState, LobbySlotState } from "../schema/GravityCanyonState.js";

const players = [
  { sessionId: "red-session", joinOrder: 1, ready: false },
  { sessionId: "blue-session", joinOrder: 2, ready: false },
  { sessionId: "spectator-session", joinOrder: 3, ready: false },
];

test("assignLobbyRoles makes the first player host and keeps later joiners as players", () => {
  const roles = assignLobbyRoles(players);

  assertDefaultLobbyRoles(roles);
});

test("assignLobbyRoles uses joinOrder rather than input order", () => {
  const roles = assignLobbyRoles([
    { sessionId: "spectator-session", joinOrder: 3, ready: false },
    { sessionId: "blue-session", joinOrder: 2, ready: false },
    { sessionId: "red-session", joinOrder: 1, ready: false },
  ]);

  assertDefaultLobbyRoles(roles);
});

test("assignLobbyRoles transfers host to the earliest remaining player", () => {
  const roles = assignLobbyRoles([
    { sessionId: "blue-session", joinOrder: 2, ready: false },
    { sessionId: "spectator-session", joinOrder: 3, ready: false },
  ]);

  assert.equal(roles.get("blue-session"), "host");
  assert.equal(roles.get("spectator-session"), "player");
});

test("activeSlotIdsForMode exposes one unit per team in 1v1 and two per team in 2v2", () => {
  assert.deepEqual(activeSlotIdsForMode("1v1"), ["red-1", "blue-1"]);
  assert.deepEqual(activeSlotIdsForMode("2v2"), ["red-1", "blue-1", "red-2", "blue-2"]);
});

test("only the owning player can edit a claimed slot", () => {
  assert.equal(canEditSlot("red-session", "red-session"), true);
  assert.equal(canEditSlot("red-session", "blue-session"), false);
  assert.equal(canEditSlot("", "red-session"), false);
});

test("defaultCharacterForSlot preserves the four-seat 2v2 test roster", () => {
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

test("isReadyToAutoStart requires every active seat to be claimed, ready, and valid", () => {
  assert.equal(
    isReadyToAutoStart({
      mode: "2v2",
      players: [
        { sessionId: "red-session", joinOrder: 1, ready: true },
        { sessionId: "blue-session", joinOrder: 2, ready: true },
      ],
      slots: [
        lobbySlot("red-1", "red-session", "nova"),
        lobbySlot("blue-1", "blue-session", "vesper"),
        lobbySlot("red-2", "", "kaelii"),
        lobbySlot("blue-2", "perlah-session", "perlah"),
      ],
    }),
    false,
  );

  assert.equal(
    isReadyToAutoStart({
      mode: "2v2",
      players: [
        { sessionId: "red-session", joinOrder: 1, ready: true },
        { sessionId: "blue-session", joinOrder: 2, ready: false },
        { sessionId: "kaelii-session", joinOrder: 3, ready: true },
        { sessionId: "perlah-session", joinOrder: 4, ready: true },
      ],
      slots: [
        lobbySlot("red-1", "red-session", "nova"),
        lobbySlot("blue-1", "blue-session", "vesper"),
        lobbySlot("red-2", "kaelii-session", "kaelii"),
        lobbySlot("blue-2", "perlah-session", "perlah"),
      ],
    }),
    false,
  );

  assert.equal(
    isReadyToAutoStart({
      mode: "2v2",
      players: [
        { sessionId: "red-session", joinOrder: 1, ready: true },
        { sessionId: "blue-session", joinOrder: 2, ready: true },
        { sessionId: "kaelii-session", joinOrder: 3, ready: true },
        { sessionId: "perlah-session", joinOrder: 4, ready: true },
      ],
      slots: [
        lobbySlot("red-1", "red-session", "nova"),
        lobbySlot("blue-1", "blue-session", "vesper"),
        lobbySlot("red-2", "kaelii-session", "kaelii"),
        lobbySlot("blue-2", "perlah-session", "not-real"),
      ],
    }),
    false,
  );

  assert.equal(
    isReadyToAutoStart({
      mode: "2v2",
      players: [
        { sessionId: "red-session", joinOrder: 1, ready: true },
        { sessionId: "blue-session", joinOrder: 2, ready: true },
        { sessionId: "kaelii-session", joinOrder: 3, ready: true },
        { sessionId: "perlah-session", joinOrder: 4, ready: true },
      ],
      slots: [
        lobbySlot("red-1", "red-session", "nova"),
        lobbySlot("blue-1", "blue-session", "vesper"),
        lobbySlot("red-2", "kaelii-session", "kaelii"),
        lobbySlot("blue-2", "perlah-session", "perlah"),
      ],
    }),
    true,
  );
});

test("GravityCanyonState exposes host lobby defaults", () => {
  const state = new GravityCanyonState();

  assert.equal(state.mode, "2v2");
  assert.equal(state.hostSessionId, "");
  assert.equal(state.spectatorSessionIds.length, 0);
  assert.equal(state.slots.size, 0);
});

test("LobbySlotState carries active slot ownership and character selection", () => {
  const slot = new LobbySlotState();
  slot.slotId = "red-1";
  slot.team = "red";
  slot.ownerSessionId = "red-session";
  slot.selectedCharacterId = "nova";
  slot.active = true;

  assert.equal(slot.slotId, "red-1");
  assert.equal(slot.team, "red");
  assert.equal(slot.ownerSessionId, "red-session");
  assert.equal(slot.selectedCharacterId, "nova");
  assert.equal(slot.active, true);
});

test("buildPreviewSlots uses the claimed active seats in 1v1", () => {
  assert.deepEqual(
    buildPreviewSlots({
      mode: "1v1",
      slots: [
        lobbySlot("red-1", "red-session", "kaelii"),
        lobbySlot("blue-1", "blue-session", "perlah"),
        lobbySlot("red-2", "kaelii-session", "nova"),
      ],
    }),
    [
      { slotId: "red-1", ownerSessionId: "red-session", selectedCharacterId: "kaelii" },
      { slotId: "blue-1", ownerSessionId: "blue-session", selectedCharacterId: "perlah" },
    ],
  );
});

test("buildPreviewSlots uses one owner per claimed seat in 2v2", () => {
  assert.deepEqual(
    buildPreviewSlots({
      mode: "2v2",
      slots: [
        lobbySlot("red-1", "red-session", "nova"),
        lobbySlot("blue-1", "blue-session", "vesper"),
        lobbySlot("red-2", "kaelii-session", "kaelii"),
        lobbySlot("blue-2", "perlah-session", "perlah"),
      ],
    }),
    [
      { slotId: "red-1", ownerSessionId: "red-session", selectedCharacterId: "nova" },
      { slotId: "blue-1", ownerSessionId: "blue-session", selectedCharacterId: "vesper" },
      { slotId: "red-2", ownerSessionId: "kaelii-session", selectedCharacterId: "kaelii" },
      { slotId: "blue-2", ownerSessionId: "perlah-session", selectedCharacterId: "perlah" },
    ],
  );
});

function lobbySlot(slotId: string, ownerSessionId: string, selectedCharacterId: string) {
  return {
    slotId,
    ownerSessionId,
    selectedCharacterId,
    active: true,
  };
}

function assertDefaultLobbyRoles(roles: Map<string, string>): void {
  assert.equal(roles.get("red-session"), "host");
  assert.equal(roles.get("blue-session"), "player");
  assert.equal(roles.get("spectator-session"), "player");
}
