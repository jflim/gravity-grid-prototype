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

test("localRoleLabel names the local captain role", () => {
  assert.equal(localRoleLabel("red-captain"), "Red captain");
  assert.equal(localRoleLabel("blue-captain"), "Blue captain");
  assert.equal(localRoleLabel("spectator"), "Spectator");
  assert.equal(localRoleLabel("unknown"), "Waiting");
});

test("canLocalPlayerEditSlot follows captain team ownership", () => {
  assert.equal(canLocalPlayerEditSlot("red-captain", "red-1"), true);
  assert.equal(canLocalPlayerEditSlot("red-captain", "blue-1"), false);
  assert.equal(canLocalPlayerEditSlot("blue-captain", "blue-2"), true);
  assert.equal(canLocalPlayerEditSlot("spectator", "red-1"), false);
});

test("canLocalPlayerUseLobbyControls keeps captains interactive during ready phase", () => {
  assert.equal(canLocalPlayerUseLobbyControls("red-captain", "ready"), true);
  assert.equal(canLocalPlayerUseLobbyControls("blue-captain", "ready"), true);
  assert.equal(canLocalPlayerUseLobbyControls("red-captain", "lobby"), true);
  assert.equal(canLocalPlayerUseLobbyControls("spectator", "ready"), false);
  assert.equal(canLocalPlayerUseLobbyControls("red-captain", "combat-preview"), false);
});

test("stageForRoomPhase separates lobby and gameplay scenes", () => {
  assert.equal(stageForRoomPhase("lobby"), "lobby");
  assert.equal(stageForRoomPhase("ready"), "lobby");
  assert.equal(stageForRoomPhase("combat-preview"), "gameplay");
  assert.equal(stageForRoomPhase("round-over"), "gameplay");
});

test("modeLabel and slotLabel keep lobby wording short", () => {
  assert.equal(modeLabel("1v1"), "1v1");
  assert.equal(modeLabel("2v2"), "2v2");
  assert.equal(slotLabel("red-1"), "Red 1");
  assert.equal(slotLabel("blue-2"), "Blue 2");
});

test("lobbyStatusText explains the blocked start state", () => {
  assert.equal(
    lobbyStatusText({
      status: "Waiting for blue captain.",
      redCaptainName: "NovaHost",
      blueCaptainName: "",
      redReady: true,
      blueReady: false,
    }),
    "Waiting for blue captain.",
  );

  assert.equal(
    lobbyStatusText({
      status: "",
      redCaptainName: "NovaHost",
      blueCaptainName: "VesperFriend",
      redReady: true,
      blueReady: false,
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
