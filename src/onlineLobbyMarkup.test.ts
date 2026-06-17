import assert from "node:assert/strict";
import test from "node:test";
import { renderLobbyShell, renderPlayerRows, renderSlotRows } from "./onlineLobbyMarkup";

test("renderLobbyShell owns the online stage shell markup", () => {
  const html = renderLobbyShell();

  assertIncludesAll(html, [
    /class="online-stage"/,
    /data-ready-toggle/,
    /data-slot-list/,
    /data-host-label/,
    /data-mode-choice="1v1"/,
    /data-mode-choice="2v2"/,
    /data-character-picker/,
    /data-character-picker-options/,
    /data-auto-connect hidden/,
    /Lobby Host/,
    /Host controls mode/,
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
        role: "host",
        joinOrder: 1,
        ready: true,
        tokens: 0,
        equippedNameplate: "Canyon Rookie",
        inventory: [],
      },
    ],
    "red-session",
  );

  assertIncludesAll(html, [/&lt;Red&gt;/, /Host - You/]);
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
    "red-session",
    "ready",
  );

  assertIncludesAll(html, [
    /online-team-column online-team-column--red/,
    /online-team-column online-team-column--blue/,
    /Red Team/,
    /Blue Team/,
    /Red is ready/,
    /Open blue seat/,
    /data-seat-action="pick"/,
    /data-seat-action="claim"/,
    /src="\/assets\/nova-unit-default.webp"/,
    /src="\/assets\/nova-vehicle-sprite.webp"/,
  ]);
  assertExcludesAll(html, [/<select/]);
});

test("renderSlotRows locks seats owned by another player", () => {
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
    "red-session",
    "ready",
  );

  assertIncludesAll(html, [/Blue 1/, /Vesper/, /Occupied/, /disabled/]);
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
