import assert from "node:assert/strict";
import test from "node:test";
import {
  activeVehicleFor,
  canFireActiveVehicle,
  canStartNextPreviewRound,
  gameplayPreviewBadge,
} from "./onlineGameplayPreviewView";
import { previewRoomSnapshot } from "./onlineGameplayPreviewTestData";

test("canFireActiveVehicle allows only the active vehicle owner during combat preview", () => {
  const snapshot = previewRoomSnapshot({
    phase: "combat-preview",
    activeVehicleId: "red-1",
  });

  assert.equal(canFireActiveVehicle(snapshot, "red-session"), true);
  assert.equal(canFireActiveVehicle(snapshot, "blue-session"), false);
});

test("activeVehicleFor returns the active server vehicle", () => {
  const snapshot = previewRoomSnapshot({
    activeVehicleId: "blue-1",
  });

  assert.equal(activeVehicleFor(snapshot)?.displayName, "Blue / Vesper");
});

test("canStartNextPreviewRound allows the host after a round-over state", () => {
  const snapshot = previewRoomSnapshot({
    phase: "round-over",
  });

  assert.equal(canStartNextPreviewRound(snapshot, "red-session"), true);
  assert.equal(canStartNextPreviewRound(snapshot, "blue-session"), false);
});

test("gameplayPreviewBadge names shared preview phases", () => {
  assert.equal(gameplayPreviewBadge(previewRoomSnapshot({ phase: "combat-preview" })), "Live");
  assert.equal(gameplayPreviewBadge(previewRoomSnapshot({ phase: "round-over" })), "Round Over");
  assert.equal(gameplayPreviewBadge(previewRoomSnapshot({ phase: "lobby" })), "Lobby");
});
