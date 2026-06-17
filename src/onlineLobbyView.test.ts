import assert from "node:assert/strict";
import test from "node:test";
import {
  canLocalPlayerUseLobbyControls,
  canLocalPlayerEditSlot,
  lobbyStatusText,
  localRoleLabel,
  modeLabel,
  normalizeLobbySlots,
  stageForRoomPhase,
  slotLabel,
} from "./onlineLobbyView";

test("localRoleLabel names host and player roles", () => {
  assert.equal(localRoleLabel("host"), "Host");
  assert.equal(localRoleLabel("player"), "Player");
  assert.equal(localRoleLabel("spectator"), "Spectator");
  assert.equal(localRoleLabel("unknown"), "Waiting");
});

test("canLocalPlayerEditSlot follows claimed seat ownership", () => {
  assert.equal(canLocalPlayerEditSlot("red-session", "red-session"), true);
  assert.equal(canLocalPlayerEditSlot("red-session", "blue-session"), false);
  assert.equal(canLocalPlayerEditSlot("", "red-session"), false);
});

test("canLocalPlayerUseLobbyControls keeps seated players interactive during ready phase", () => {
  assert.equal(canLocalPlayerUseLobbyControls(true, "ready"), true);
  assert.equal(canLocalPlayerUseLobbyControls(true, "lobby"), true);
  assert.equal(canLocalPlayerUseLobbyControls(false, "ready"), false);
  assert.equal(canLocalPlayerUseLobbyControls(true, "combat-preview"), false);
});

test("stageForRoomPhase separates lobby and gameplay scenes", () => {
  assert.equal(stageForRoomPhase("lobby"), "lobby");
  assert.equal(stageForRoomPhase("ready"), "lobby");
  assert.equal(stageForRoomPhase("combat-preview"), "gameplay");
  assert.equal(stageForRoomPhase("round-over"), "gameplay");
});

test("modeLabel and slotLabel keep lobby wording short", () => {
  assert.equal(modeLabel("1v1"), "Duel");
  assert.equal(modeLabel("2v2"), "Doubles");
  assert.equal(slotLabel("red-1"), "Red 1");
  assert.equal(slotLabel("blue-2"), "Blue 2");
});

test("lobbyStatusText explains the blocked start state", () => {
  assert.equal(
    lobbyStatusText({
      status: "Waiting for blue seat.",
      hostName: "NovaHost",
      openSeatCount: 1,
      nextReadyName: "",
    }),
    "Waiting for blue seat.",
  );

  assert.equal(
    lobbyStatusText({
      status: "",
      hostName: "NovaHost",
      openSeatCount: 0,
      nextReadyName: "VesperFriend",
    }),
    "Waiting for VesperFriend to ready.",
  );
});

test("normalizeLobbySlots reads Colyseus map slot state and owner labels", () => {
  const slots = new Map<string, unknown>([
    [
      "red-1",
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        selectedCharacterId: "kaelii",
        active: true,
      },
    ],
    [
      "blue-1",
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "blue-session",
        selectedCharacterId: "vesper",
        active: true,
      },
    ],
  ]);

  assert.deepEqual(
    normalizeLobbySlots(slots, [
      { sessionId: "red-session", displayName: "RedTest", ready: true },
      { sessionId: "blue-session", displayName: "BlueTest", ready: false },
    ]),
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        characterId: "kaelii",
        displayName: "RedTest",
        ready: true,
        active: true,
      },
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "blue-session",
        characterId: "vesper",
        displayName: "BlueTest",
        ready: false,
        active: true,
      },
    ],
  );
});
