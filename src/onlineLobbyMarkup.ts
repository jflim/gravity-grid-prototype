import type { PlayerSnapshot } from "./onlineLobbySnapshot";
import {
  canLocalPlayerEditSlot,
  localRoleLabel,
  slotLabel,
  type LobbySlotView,
} from "./onlineLobbyView";

const CHARACTER_OPTIONS = ["nova", "vesper", "kaelii", "perlah"] as const;
const SLOT_ORDER = ["red-1", "blue-1", "red-2", "blue-2"];

export function renderLobbyShell(): string {
  return `
    <section class="online-stage">
      <aside class="online-panel">
        <div class="online-panel__header">
          <div>
            <p class="online-panel__eyebrow">Online Alpha</p>
            <h1>Gravity Canyon</h1>
          </div>
          <span class="online-panel__badge" data-status-badge>Offline</span>
        </div>
        <div class="online-panel__field">
          <label for="display-name">Display Name</label>
          <input id="display-name" maxlength="18" value="Guest" autocomplete="off" />
        </div>
        <div class="online-panel__actions">
          <button type="button" data-auto-connect>Reconnect</button>
        </div>
        <div class="online-panel__room" data-room-block hidden>
          <div class="online-panel__room-code">
            <span>Playtest Room</span>
            <strong data-room-code></strong>
          </div>
          <div class="online-panel__field">
            <label for="mode-select">Mode</label>
            <select id="mode-select" data-mode-select>
              <option value="2v2">2v2</option>
              <option value="1v1">1v1</option>
            </select>
          </div>
          <p class="online-panel__status" data-room-status></p>
          <div class="online-panel__players" data-player-list></div>
          <div class="online-panel__slots" data-slot-list></div>
          <div class="online-panel__actions">
            <button type="button" data-ready-toggle>Ready</button>
            <button type="button" data-test-capsule>Capsule</button>
          </div>
          <div class="online-panel__field">
            <label for="nameplate-select">Nameplate</label>
            <select id="nameplate-select" data-nameplate-select></select>
          </div>
          <p class="online-panel__reward" data-reward-log></p>
        </div>
      </aside>
    </section>
  `;
}

export function renderPlayerRows(players: readonly PlayerSnapshot[], localSessionId: string): string {
  return players
    .map((player) => {
      const state = player.role === "spectator" ? "Watching" : player.ready ? "Ready" : "Waiting";
      const you = player.sessionId === localSessionId ? "You" : "";
      return `
        <div class="online-player online-player--${escapeHtml(player.team)}">
          <div>
            <strong>${escapeHtml(player.displayName)}</strong>
            <span>${escapeHtml(localRoleLabel(player.role))}${you ? ` - ${you}` : ""}</span>
          </div>
          <em>${state}</em>
        </div>
      `;
    })
    .join("");
}

export function renderSlotRows(
  slots: readonly LobbySlotView[],
  localRole: string,
  canUseLobbyControls: boolean,
): string {
  return slots
    .filter((slot) => slot.active)
    .sort((left, right) => slotSortValue(left.slotId) - slotSortValue(right.slotId))
    .map((slot) => {
      const editable = canUseLobbyControls && canLocalPlayerEditSlot(localRole, slot.slotId);
      const options = CHARACTER_OPTIONS.map((characterId) => {
        const selected = characterId === slot.characterId ? " selected" : "";
        return `<option value="${characterId}"${selected}>${capitalize(characterId)}</option>`;
      }).join("");

      return `
        <div class="online-slot online-slot--${escapeHtml(slot.team)}">
          <div>
            <strong>${escapeHtml(slotLabel(slot.slotId))}</strong>
            <span>${escapeHtml(slot.displayName || "Open")}</span>
          </div>
          <select data-slot-select="true" data-slot-id="${escapeHtml(slot.slotId)}"${editable ? "" : " disabled"}>
            ${options}
          </select>
          <em>${slot.ready ? "Ready" : "Waiting"}</em>
        </div>
      `;
    })
    .join("");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function slotSortValue(slotId: string): number {
  const index = SLOT_ORDER.indexOf(slotId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
