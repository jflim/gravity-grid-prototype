import assert from "node:assert/strict";
import test from "node:test";
import { renderLobbyShell, renderPlayerRows, renderSlotRows } from "./onlineLobbyMarkup";

test("renderLobbyShell owns the online stage shell markup", () => {
  const html = renderLobbyShell();

  assert.match(html, /class="online-stage"/);
  assert.match(html, /data-ready-toggle/);
  assert.match(html, /data-slot-list/);
});

test("renderPlayerRows escapes display names and marks the local player", () => {
  const html = renderPlayerRows(
    [
      {
        sessionId: "red-session",
        displayName: "<Red>",
        team: "red",
        role: "red-captain",
        joinOrder: 1,
        ready: true,
        tokens: 0,
        equippedNameplate: "Canyon Rookie",
        inventory: [],
      },
    ],
    "red-session",
  );

  assert.match(html, /&lt;Red&gt;/);
  assert.match(html, /Red captain - You/);
  assert.doesNotMatch(html, /<Red>/);
});

test("renderSlotRows disables slots the local player cannot edit", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "blue-session",
        characterId: "vesper",
        displayName: "Blue",
        ready: false,
        active: true,
      },
    ],
    "red-captain",
    true,
  );

  assert.match(html, /Blue 1/);
  assert.match(html, /value="vesper" selected/);
  assert.match(html, /disabled/);
});
