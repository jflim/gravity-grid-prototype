import assert from "node:assert/strict";
import test from "node:test";
import {
  joinDisplayNameValue,
  lobbyRenderModel,
  lobbySeatActionIntent,
  lobbySlotsWithOptimisticCharacters,
  readyControlPresentation,
} from "./onlineLobbyDom";
import { getRoomSnapshot } from "./onlineLobbySnapshot";
import type { LobbySlotView } from "./onlineLobbyView";

test("claiming a seat only claims the seat and does not open the unit picker", () => {
  assert.equal(lobbySeatActionIntent("claim"), "claim-seat");
  assert.equal(lobbySeatActionIntent("pick"), "open-picker");
  assert.equal(lobbySeatActionIntent(undefined), "none");
});

test("join display names trim typed names and generate a readable guest fallback", () => {
  assert.equal(joinDisplayNameValue("  Canyon Pilot  ", () => 0.425), "Canyon Pilot");
  assert.equal(joinDisplayNameValue("", () => 0.425), "Guest 482");
  assert.equal(joinDisplayNameValue("   ", () => 0), "Guest 100");
});

test("owned seats can still choose a unit before ready is enabled", () => {
  const model = redSessionModel(redSlot());

  assert.equal(model.canUseLobbyControls, true);
  assert.equal(model.canReady, false);
});

test("ready control stays hidden until the local player owns an active seat", () => {
  const model = redSessionModel(redSlot({ ownerSessionId: "", displayName: "Open" }));

  assert.deepEqual(readyControlPresentation(model), {
    buttonDisabled: true,
    buttonHidden: true,
    buttonText: "Ready",
    helperText: "Claim a seat to ready.",
    panelHidden: true,
  });
});

test("ready control is visible for seated players and disabled until unit selection", () => {
  const unselectedModel = lobbyRenderModel(
    getRoomSnapshot({
      roomCode: "auto-room",
      phase: "lobby",
      status: "",
      hostSessionId: "red-session",
      mode: "2v2",
      matchLength: "best-of-1",
      mapPick: "random",
      players: [
        {
          sessionId: "red-session",
          displayName: "Red",
          team: "red",
          role: "host",
          joinOrder: 1,
          ready: false,
          tokens: 0,
          equippedNameplate: "Canyon Rookie",
          inventory: [],
        },
      ],
      slots: [redSlot({ characterSelected: false })],
    }),
    "red-session",
    false,
  );
  const selectedModel = lobbyRenderModel(
    getRoomSnapshot({
      roomCode: "auto-room",
      phase: "lobby",
      status: "",
      hostSessionId: "red-session",
      mode: "2v2",
      matchLength: "best-of-1",
      mapPick: "random",
      players: [
        {
          sessionId: "red-session",
          displayName: "Red",
          team: "red",
          role: "host",
          joinOrder: 1,
          ready: true,
          tokens: 0,
          equippedNameplate: "Canyon Rookie",
          inventory: [],
        },
      ],
      slots: [redSlot({ characterSelected: true, ready: true })],
    }),
    "red-session",
    true,
  );

  assert.deepEqual(readyControlPresentation(unselectedModel), {
    buttonDisabled: true,
    buttonHidden: false,
    buttonText: "Ready",
    helperText: "Choose a unit before readying.",
    panelHidden: false,
  });
  assert.deepEqual(readyControlPresentation(selectedModel), {
    buttonDisabled: false,
    buttonHidden: false,
    buttonText: "Unready",
    helperText: "Ready when your unit is set.",
    panelHidden: false,
  });
});

test("ready control treats server-ready seats as unit-confirmed if selection flag is stale", () => {
  const model = lobbyRenderModel(
    getRoomSnapshot({
      roomCode: "auto-room",
      phase: "ready",
      status: "",
      hostSessionId: "red-session",
      mode: "1v1",
      matchLength: "best-of-1",
      mapPick: "random",
      players: [
        {
          sessionId: "red-session",
          displayName: "Red",
          team: "red",
          role: "host",
          joinOrder: 1,
          ready: true,
          tokens: 0,
          equippedNameplate: "Canyon Rookie",
          inventory: [],
        },
      ],
      slots: [redSlot({ characterId: "vesper", characterSelected: false, ready: true })],
    }),
    "red-session",
    true,
  );

  assert.deepEqual(readyControlPresentation(model), {
    buttonDisabled: false,
    buttonHidden: false,
    buttonText: "Unready",
    helperText: "Ready when your unit is set.",
    panelHidden: false,
  });
});

test("pending character selections preview the chosen local unit until the server confirms", () => {
  const selections = pendingVesperSelection();
  const slots = redSlotsWithOptimisticCharacters(selections, redSlot());

  assert.equal(slots[0].characterId, "vesper");
  assert.equal(slots[0].characterSelected, true);
  assert.equal(selections.has("red-1"), true);
});

test("server-confirmed character selections clear pending local previews", () => {
  const selections = pendingVesperSelection();
  const slots = redSlotsWithOptimisticCharacters(
    selections,
    redSlot({ characterId: "vesper", characterSelected: true }),
  );

  assert.equal(slots[0].characterId, "vesper");
  assert.equal(slots[0].characterSelected, true);
  assert.equal(selections.has("red-1"), false);
});

function redSlot(overrides: Partial<LobbySlotView> = {}): LobbySlotView {
  return {
    slotId: "red-1",
    team: "red",
    ownerSessionId: "red-session",
    characterId: "nova",
    characterSelected: false,
    displayName: "Red",
    ready: false,
    active: true,
    ...overrides,
  };
}

test("optimistic character selections are ignored once seat ownership changes", () => {
  const selections = pendingVesperSelection();
  const slots = redSlotsWithOptimisticCharacters(
    selections,
    redSlot({ ownerSessionId: "other-session", displayName: "Other" }),
  );

  assert.equal(slots[0].characterId, "nova");
  assert.equal(slots[0].characterSelected, false);
  assert.equal(selections.has("red-1"), false);
});

function redSessionModel(slot: LobbySlotView, localReady = false) {
  return lobbyRenderModel(
    getRoomSnapshot({
      roomCode: "auto-room",
      phase: "lobby",
      status: "",
      hostSessionId: "red-session",
      mode: "2v2",
      matchLength: "best-of-1",
      mapPick: "random",
      players: [
        {
          sessionId: "red-session",
          displayName: "Red",
          team: "red",
          role: "host",
          joinOrder: 1,
          ready: false,
          tokens: 0,
          equippedNameplate: "Canyon Rookie",
          inventory: [],
        },
      ],
      slots: [slot],
    }),
    "red-session",
    localReady,
  );
}

function pendingVesperSelection() {
  return new Map([["red-1", "vesper"]]);
}

function redSlotsWithOptimisticCharacters(selections: Map<string, string>, slot: LobbySlotView): LobbySlotView[] {
  return lobbySlotsWithOptimisticCharacters([slot], "red-session", selections);
}
