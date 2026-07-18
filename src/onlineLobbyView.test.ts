import assert from "node:assert/strict";
import test from "node:test";
import {
  canLocalPlayerChangeMode,
  canLocalPlayerChangeRoomSettings,
  canLocalPlayerUseLobbyControls,
  lobbyHostLabel,
  canLocalPlayerEditSlot,
  lobbyStatusText,
  localRoleLabel,
  mapPickLabel,
  mapPickSummaryLabel,
  matchLengthLabel,
  matchLengthRoundsToWinLabel,
  matchLengthSubLabel,
  modeLabel,
  modeSubLabel,
  normalizeLobbySlots,
  roomDisplayLabel,
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

test("canLocalPlayerChangeMode allows only the host before gameplay starts", () => {
  assert.equal(canLocalPlayerChangeMode(true, "lobby"), true);
  assert.equal(canLocalPlayerChangeMode(true, "ready"), true);
  assert.equal(canLocalPlayerChangeMode(false, "lobby"), false);
  assert.equal(canLocalPlayerChangeMode(true, "combat-preview"), false);
});

test("canLocalPlayerChangeRoomSettings allows only the host before gameplay starts", () => {
  assert.equal(canLocalPlayerChangeRoomSettings(true, "ready"), true);
  assert.equal(canLocalPlayerChangeRoomSettings(false, "ready"), false);
  assert.equal(canLocalPlayerChangeRoomSettings(true, "round-over"), false);
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
  assert.equal(modeSubLabel("1v1"), "1 unit per side");
  assert.equal(modeSubLabel("2v2"), "2 units per side");
  assert.equal(matchLengthLabel("best-of-1"), "Best of 1");
  assert.equal(matchLengthLabel("best-of-3"), "Best of 3");
  assert.equal(matchLengthRoundsToWinLabel("best-of-1"), "1");
  assert.equal(matchLengthRoundsToWinLabel("best-of-3"), "2");
  assert.equal(matchLengthSubLabel("best-of-3"), "Best of 3");
  assert.equal(mapPickLabel("random"), "Random Map");
  assert.equal(mapPickLabel("ring-basin"), "Ringworks Basin");
  assert.equal(mapPickSummaryLabel("bridgeworks"), "stacked natural bridges and broken spans over open canyon air");
  assert.equal(slotLabel("red-1"), "Red 1");
  assert.equal(slotLabel("blue-2"), "Blue 2");
});

test("roomDisplayLabel hides internal auto-room naming from players", () => {
  assert.equal(roomDisplayLabel("auto-room", "real-room-id"), "Shared playtest room");
  assert.equal(roomDisplayLabel("", "real-room-id"), "real-room-id");
  assert.equal(roomDisplayLabel("", ""), "Room pending");
});

test("lobbyHostLabel names the host and marks the local host", () => {
  const players = [
    { sessionId: "host-session", displayName: "RedHost" },
    { sessionId: "friend-session", displayName: "BlueFriend" },
  ];

  assert.equal(lobbyHostLabel(players, "host-session", "host-session"), "RedHost (You)");
  assert.equal(lobbyHostLabel(players, "host-session", "friend-session"), "RedHost");
  assert.equal(lobbyHostLabel(players, "", "friend-session"), "Assigning host");
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
        characterSelected: true,
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
        characterSelected: false,
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
        characterSelected: true,
        displayName: "RedTest",
        ready: true,
        active: true,
      },
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "blue-session",
        characterId: "vesper",
        characterSelected: false,
        displayName: "BlueTest",
        ready: false,
        active: true,
      },
    ],
  );
});
