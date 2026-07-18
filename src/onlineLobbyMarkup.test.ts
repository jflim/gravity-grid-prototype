import assert from "node:assert/strict";
import test from "node:test";
import { renderCharacterPickerOptions, renderLobbyShell, renderPlayerRows, renderSlotRows } from "./onlineLobbyMarkup";

test("renderLobbyShell owns the online stage shell markup", () => {
  const html = renderLobbyShell();

  assertIncludesAll(html, [
    /class="online-stage"/,
    /class="online-lobby-layout"/,
    /class="online-lobby-blue"/,
    /class="online-map-preview"/,
    /data-selected-map-name/,
    /data-map-pick-choice="random"/,
    /data-join-playtest/,
    /data-join-display-name/,
    /data-join-playtest-button/,
    /Join Playtest/,
    /Private-room artillery playtest/,
    /Name is locked after joining this room/,
    /data-ready-toggle/,
    /data-slot-list/,
    /data-host-label/,
    /data-mode-choice="1v1"/,
    /data-mode-choice="2v2"/,
    /data-match-length-choice="best-of-1"/,
    /data-match-length-choice="best-of-3"/,
    /data-map-pick-choice/,
    /Bridgeworks/,
    /data-player-ready-panel/,
    /data-character-picker/,
    /data-character-picker-options/,
    /data-auto-connect hidden/,
    /Lobby Host/,
    /Room Settings/,
    /Match Mode/,
    /Rounds To Win/,
    /Room Access/,
    /Private Link/,
    /Start State/,
    /Ready Status/,
    /data-ready-helper/,
    /Claim a seat to ready/,
    />Choose Unit</,
  ]);
  assertExcludesAll(html, [
    /id="display-name"/,
    />Reconnect</,
    /Nameplate/,
    /Capsule/,
    /<select/,
    /Host Console/,
    /Map Pool/,
    /data-selected-map-count/,
    /Your Ready/,
    /Available after your unit is chosen/,
    oldUnitTermPattern(),
  ]);
});

test("renderLobbyShell keeps Ready near the player context instead of room settings", () => {
  const html = renderLobbyShell();

  assert.match(html, /<aside class="online-lobby-console" aria-label="Room Settings">/);
  assert.match(html, /<h2>Room Settings<\/h2>/);
  assert.match(html, /data-player-ready-panel[\s\S]*data-ready-toggle/);
  assert.doesNotMatch(html, /online-lobby-start[\s\S]*data-ready-toggle/);
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

test("renderPlayerRows reports server-ready owned slots as ready", () => {
  const html = renderPlayerRows(
    [
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
      {
        sessionId: "blue-session",
        displayName: "Blue",
        team: "blue",
        role: "player",
        joinOrder: 2,
        ready: true,
        tokens: 0,
        equippedNameplate: "Canyon Rookie",
        inventory: [],
      },
    ],
    "blue-session",
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        characterId: "nova",
        characterSelected: false,
        displayName: "Red",
        ready: true,
        active: true,
      },
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "blue-session",
        characterId: "vesper",
        characterSelected: true,
        displayName: "Blue",
        ready: true,
        active: true,
      },
    ],
  );

  assert.match(html, /Red[\s\S]*Ready/);
  assert.match(html, /Blue[\s\S]*Ready/);
});

test("renderSlotRows groups visible seats by team", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        characterId: "nova",
        characterSelected: true,
        displayName: "Red",
        ready: true,
        active: true,
      },
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "",
        characterId: "vesper",
        characterSelected: false,
        displayName: "Open",
        ready: false,
        active: true,
      },
    ],
    "red-session",
    "ready",
    "red-session",
  );

  assertIncludesAll(html, [
    /online-team-column online-team-column--red/,
    /online-team-column online-team-column--blue/,
    /Red Team/,
    /Blue Team/,
    /Red is ready/,
    /Open blue seat/,
    /online-slot--ready/,
    /online-seat__status-chip--host/,
    /online-seat__status-chip--ready/,
    /aria-label="Lobby Host"/,
    /aria-label="Ready"/,
    /data-seat-action="pick"/,
    /src="\/assets\/nova-unit-default.webp"/,
    /class="online-seat__unit-chips"/,
    /data-unit-chip="pilot"[^>]*>Nova<\/span>/,
    /data-unit-chip="vehicle"[^>]*>Bunger Rig<\/span>/,
    /online-seat__unit--empty/,
  ]);
  assertExcludesAll(html, [
    /data-seat-action="claim"/,
    /data-seat-action="locked"[^>]*>\s*Open Seat/,
    /No unit chosen/,
    /online-seat__part/,
    />Pilot</,
    oldVehicleLabelPattern(),
    /src="\/assets\/nova-vehicle-sprite.webp"/,
    /src="\/assets\/vesper-unit-default.webp"/,
    /data-unit-chip="pilot"[^>]*>Vesper<\/span>/,
    /data-unit-chip="vehicle"[^>]*>Glitch Rover<\/span>/,
    /<select/,
    /Edit Name/,
    /data-display-name-input/,
    /data-display-name-edit/,
    oldUnitTermPattern(),
  ]);
});

test("renderSlotRows aims selected units toward the opposing team using source art facing", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        characterId: "vesper",
        characterSelected: true,
        displayName: "Red",
        ready: false,
        active: true,
      },
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "blue-session",
        characterId: "vesper",
        characterSelected: true,
        displayName: "Blue",
        ready: false,
        active: true,
      },
      {
        slotId: "blue-2",
        team: "blue",
        ownerSessionId: "blue-two-session",
        characterId: "nova",
        characterSelected: true,
        displayName: "Blue Two",
        ready: false,
        active: true,
      },
    ],
    "red-session",
    "ready",
  );

  assert.match(
    html,
    /data-slot-id="red-1"[\s\S]*online-seat__unit online-seat__unit--mirrored" data-unit-source-facing="-1" data-unit-target-facing="1"/,
  );
  assert.match(
    html,
    /data-slot-id="blue-1"[\s\S]*class="online-seat__unit" data-unit-source-facing="-1" data-unit-target-facing="-1"/,
  );
  assert.match(
    html,
    /data-slot-id="blue-2"[\s\S]*online-seat__unit online-seat__unit--mirrored" data-unit-source-facing="1" data-unit-target-facing="-1"/,
  );
});

test("renderSlotRows keeps unclaimed seats quiet until a player owns them", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "",
        characterId: "nova",
        characterSelected: false,
        displayName: "Open",
        ready: false,
        active: true,
      },
    ],
    "red-session",
    "lobby",
  );

  assertIncludesAll(html, [/Open red seat/, /data-seat-action="claim"/, /Claim Seat/, /online-seat__unit--empty/]);
  assertExcludesAll(html, [
    /Open Seat/,
    /No unit chosen/,
    /Choose a unit to ready/,
    /src="\/assets\/nova-unit-default.webp"/,
    oldUnitTermPattern(),
  ]);
});

test("renderSlotRows shows one clear choose-unit action for the owned unselected seat", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        characterId: "nova",
        characterSelected: false,
        displayName: "Red",
        ready: false,
        active: true,
      },
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "",
        characterId: "vesper",
        characterSelected: false,
        displayName: "Open",
        ready: false,
        active: true,
      },
    ],
    "red-session",
    "lobby",
  );

  assertIncludesAll(html, [
    /data-seat-action="pick"/,
    />Choose Unit</,
    /Choose a unit to ready/,
  ]);
  assertExcludesAll(html, [
    /data-seat-action="claim"/,
    /data-seat-action="locked"[^>]*>\s*Open Seat/,
    /No unit chosen/,
    /Edit Name/,
    /data-display-name-input/,
    /data-display-name-edit/,
    /src="\/assets\/vesper-unit-default.webp"/,
    oldUnitTermPattern(),
  ]);
});

test("renderSlotRows does not mark an unready unselected unit seat as ready", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        characterId: "nova",
        characterSelected: false,
        displayName: "Red",
        ready: false,
        active: true,
      },
    ],
    "red-session",
    "ready",
    "red-session",
  );

  assertIncludesAll(html, [/Red is picking/, /Choose a unit to ready/, /online-seat__status-chip--host/]);
  assertExcludesAll(html, [
    /online-slot--ready/,
    /online-seat__status-chip--ready/,
    /aria-label="Ready"/,
    oldUnitTermPattern(),
  ]);
});

test("renderSlotRows shows server-ready units even if the selected flag arrives stale", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "red-1",
        team: "red",
        ownerSessionId: "red-session",
        characterId: "vesper",
        characterSelected: false,
        displayName: "Red",
        ready: true,
        active: true,
      },
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "blue-session",
        characterId: "perlah",
        characterSelected: false,
        displayName: "Blue",
        ready: true,
        active: true,
      },
    ],
    "red-session",
    "ready",
    "red-session",
  );

  assertIncludesAll(html, [
    /Red is ready/,
    /src="\/assets\/vesper-unit-default.webp"/,
    /src="\/assets\/perlah-unit-default.webp"/,
    /data-unit-chip="pilot"[^>]*>Vesper<\/span>/,
    /data-unit-chip="pilot"[^>]*>Perlah<\/span>/,
    /online-seat__status-chip--ready/,
  ]);
  assertExcludesAll(html, [/Choose a unit to ready/]);
});

test("renderSlotRows locks seats owned by another player", () => {
  const html = renderSlotRows(
    [
      {
        slotId: "blue-1",
        team: "blue",
        ownerSessionId: "blue-session",
        characterId: "vesper",
        characterSelected: true,
        displayName: "Blue",
        ready: false,
        active: true,
      },
    ],
    "red-session",
    "ready",
    "red-session",
  );

  assertIncludesAll(html, [/Blue 1/, /Vesper/, /Occupied/, /disabled/]);
});

test("renderCharacterPickerOptions teaches unit roles and implementation status", () => {
  const html = renderCharacterPickerOptions("nova");

  assertIncludesAll(html, [
    /data-character-choice="nova"/,
    /data-character-choice="nova"[\s\S]*online-character-choice__unit online-character-choice__unit--mirrored" data-unit-source-facing="1" data-unit-target-facing="-1"/,
    /data-character-choice="vesper"[\s\S]*class="online-character-choice__unit" data-unit-source-facing="-1" data-unit-target-facing="-1"/,
    /Terrain Breaker/,
    /Implemented prototype/,
    /Carves larger craters/,
    /Crater control/,
    /Void Drop setup/,
    /Gravity Control/,
    /Design direction/,
    /pull-field setup/,
    /Vehicle: Bunger Rig/,
  ]);
  assertExcludesAll(html, [/Damage\s*\d/, /HP\s*\d/, /Speed\s*\d/, oldUnitTermPattern(), oldVehicleTitlePattern()]);
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

function oldUnitTermPattern(): RegExp {
  return new RegExp(`\\b${"fight"}ers?\\b`, "i");
}

function oldVehicleLabelPattern(): RegExp {
  return new RegExp(`>${"R"}ide<`);
}

function oldVehicleTitlePattern(): RegExp {
  return new RegExp(`\\b${"R"}ide:`);
}
