import assert from "node:assert/strict";
import test from "node:test";
import {
  renderGameplayPreview,
  renderGameplayPreviewShell,
} from "./onlineGameplayPreviewMarkup";
import { previewRoomSnapshot } from "./onlineGameplayPreviewTestData";

test("renderGameplayPreviewShell owns the shared gameplay preview surface", () => {
  const html = renderGameplayPreviewShell();

  assert.match(html, /class="online-stage online-gameplay-stage"/);
  assert.match(html, /data-gameplay-preview-root/);
});

test("renderGameplayPreview highlights the active player and enables only their fire action", () => {
  const html = renderGameplayPreview(previewRoomSnapshot(), "red-session");

  assert.match(html, /Shared Playtest/);
  assert.match(html, /Red \/ Nova/);
  assert.match(html, /Blue \/ Vesper/);
  assert.match(html, /data-preview-fire/);
  assert.doesNotMatch(html, /data-preview-fire[^>]*disabled/);
});

test("renderGameplayPreview disables fire for non-active players", () => {
  const html = renderGameplayPreview(previewRoomSnapshot(), "blue-session");

  assert.match(html, /data-preview-fire[^>]*disabled/);
});

test("renderGameplayPreview exposes next round after round over", () => {
  const html = renderGameplayPreview(
    previewRoomSnapshot({
      phase: "round-over",
      winnerTeam: "red",
      activeVehicleId: "",
      status: "Red team wins round 1.",
    }),
    "red-session",
  );

  assert.match(html, /Red team wins round 1/);
  assert.match(html, /data-next-preview-round/);
});
