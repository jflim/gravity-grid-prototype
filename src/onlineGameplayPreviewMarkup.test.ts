import assert from "node:assert/strict";
import test from "node:test";
import {
  renderGameplayPreview,
  renderGameplayPreviewShell,
} from "./onlineGameplayPreviewMarkup";
import { previewRoomSnapshot } from "./onlineGameplayPreviewTestData";
import type { RoomSnapshot } from "./onlineLobbySnapshot";

test("renderGameplayPreviewShell owns the shared gameplay preview surface", () => {
  const html = renderGameplayPreviewShell();

  assert.match(html, /class="online-stage online-gameplay-stage"/);
  assert.match(html, /data-gameplay-preview-root/);
});

test("renderGameplayPreview highlights the active player and enables only their fire action", () => {
  const html = renderRedPreview({
    selectedMapName: "Bridgeworks",
    targetScore: 2,
    turnSecondsRemaining: 18,
  });

  assertIncludesAll(html, [
    /Shared Playtest/,
    /Bridgeworks/,
    /First to 2/,
    /18s/,
    /Red \/ Nova/,
    /Blue \/ Vesper/,
    /data-preview-fire/,
  ]);
  assert.doesNotMatch(html, /data-preview-fire[^>]*disabled/);
});

test("renderGameplayPreview disables fire for non-active players", () => {
  const html = renderGameplayPreview(previewRoomSnapshot(), "blue-session");

  assert.match(html, /data-preview-fire[^>]*disabled/);
});

test("renderGameplayPreview exposes next round after round over", () => {
  const html = renderRedPreview({
    phase: "round-over",
    winnerTeam: "red",
    activeVehicleId: "",
    status: "Red team wins round 1.",
  });

  assert.match(html, /Red team wins round 1/);
  assert.match(html, /data-next-preview-round/);
});

test("renderGameplayPreview shows the latest server-owned shot result", () => {
  const html = renderRedPreview({
    lastShotId: "round-1-turn-1-red-1-2",
    lastShotShooterVehicleId: "red-1",
    lastShotOriginX: 444,
    lastShotOriginY: 555,
    lastShotAngle: 41,
    lastShotPower: 73,
    lastShotTargetVehicleId: "blue-1",
    lastShotDamage: 40,
    lastShotTargetHpBefore: 100,
    lastShotTargetHpAfter: 60,
  });

  assertIncludesAll(html, [
    /Server Shot/,
    /Red \/ Nova/,
    /Origin 444, 555/,
    /Angle 41/,
    /Power 73/,
    /Blue \/ Vesper/,
    /100 -> 60/,
  ]);
});

function renderRedPreview(overrides: Partial<RoomSnapshot> = {}): string {
  return renderGameplayPreview(previewRoomSnapshot(overrides), "red-session");
}

function assertIncludesAll(html: string, patterns: RegExp[]): void {
  for (const pattern of patterns) {
    assert.match(html, pattern);
  }
}
