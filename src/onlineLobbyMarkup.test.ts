import assert from "node:assert/strict";
import test from "node:test";
import { renderLobbyShell, renderPlayerRows, renderSlotRows } from "./onlineLobbyMarkup";

test("renderLobbyShell owns the online stage shell markup", () => {
  const html = renderLobbyShell();

  assertIncludesAll(html, [
    /class="online-stage"/,
    /data-ready-toggle/,
    /data-slot-list/,
    /data-auto-connect hidden/,
    /Red captain controls mode/,
  ]);
  assertExcludesAll(html, [/>Reconnect</, /Nameplate/, /Capsule/]);
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

  assertIncludesAll(html, [/&lt;Red&gt;/, /Red captain - You/]);
  assertExcludesAll(html, [/<Red>/]);
});

test("renderSlotRows groups visible seats by team", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        characterId: "nova",
        displayName: "Red",
        ready: true,
        active: true,
      },
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "",
        characterId: "vesper",
        displayName: "Open",
        ready: false,
        active: true,
      },
    ],
    "red-captain",
    true,
  );

  assertIncludesAll(html, [
    /online-team-column online-team-column--red/,
    /online-team-column online-team-column--blue/,
    /Red Team/,
    /Blue Team/,
    /Red controls this team/,
    /Open blue captain seat/,
  ]);
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

  assertIncludesAll(html, [/Blue 1/, /value="vesper" selected/, /disabled/]);
});

function assertIncludesAll(html: string, patterns: RegExp[]): void {
  for (const pattern of patterns) {
    assert.match(html, pattern);
  }
}

function assertExcludesAll(html: string, patterns: RegExp[]): void {
  for (const pattern of patterns) {
    assert.doesNotMatch(html, pattern);
  }
}
