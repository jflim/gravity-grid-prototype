import type { PlayerSnapshot } from "./onlineLobbySnapshot";
import {
  canLocalPlayerEditSlot,
  localRoleLabel,
  slotLabel,
  type LobbySlotView,
} from "./onlineLobbyView";

const CHARACTER_OPTIONS = ["nova", "vesper", "kaelii", "perlah"] as const;
const SLOT_ORDER = ["red-1", "blue-1", "red-2", "blue-2"];
const TEAM_ORDER = ["red", "blue"] as const;

export function renderLobbyShell(): string {
  return `
    <section class="online-stage">
      <aside class="online-panel online-lobby-panel">
        <div class="online-panel__header">
          <div>
            <p class="online-panel__eyebrow">Playtest Lobby</p>
            <h1>Gravity Canyon</h1>
          </div>
          <span class="online-panel__badge" data-status-badge>Offline</span>
        </div>
        <div class="online-panel__field">
          <label for="display-name">Display Name</label>
          <input id="display-name" maxlength="18" value="Guest" autocomplete="off" />
        </div>
        <div class="online-panel__actions">
          <button type="button" class="online-panel__retry" data-auto-connect hidden>Retry Connection</button>
        </div>
        <div class="online-panel__room" data-room-block hidden>
          <div class="online-lobby-roombar">
            <div class="online-panel__room-code">
              <span>Playtest Room</span>
              <strong data-room-code></strong>
            </div>
            <div class="online-panel__field online-lobby-mode">
              <label for="mode-select">
                Mode
                <span>Red captain controls mode</span>
              </label>
              <select id="mode-select" data-mode-select aria-label="Mode - Red captain controls mode">
                <option value="2v2">2v2</option>
                <option value="1v1">1v1</option>
              </select>
            </div>
          </div>
          <p class="online-panel__status" data-room-status></p>
          <div class="online-panel__players" data-player-list></div>
          <div class="online-panel__slots" data-slot-list></div>
          <div class="online-panel__actions">
            <button type="button" data-ready-toggle>Ready</button>
          </div>
        </div>
      </aside>
    </section>
  `;
}

export function renderPlayerRows(players: readonly PlayerSnapshot[], localSessionId: string): string {
  return players.map((player) => renderPlayerRow(player, localSessionId)).join("");
}

export function renderSlotRows(
  slots: readonly LobbySlotView[],
  localRole: string,
  canUseLobbyControls: boolean,
): string {
  const sortedSlots = [...slots].sort((left, right) => slotSortValue(left.slotId) - slotSortValue(right.slotId));
  return TEAM_ORDER.map((team) => renderTeamColumn(team, sortedSlots, localRole, canUseLobbyControls)).join("");
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

function renderPlayerRow(player: PlayerSnapshot, localSessionId: string): string {
  return `
    <div class="online-player online-player--${escapeHtml(player.team)}">
      <div>
        <strong>${escapeHtml(player.displayName)}</strong>
        <span>${escapeHtml(playerRoleText(player, localSessionId))}</span>
      </div>
      <em>${escapeHtml(playerStateText(player))}</em>
    </div>
  `;
}

function playerRoleText(player: PlayerSnapshot, localSessionId: string): string {
  const roleLabel = localRoleLabel(player.role);
  return player.sessionId === localSessionId ? `${roleLabel} - You` : roleLabel;
}

function playerStateText(player: PlayerSnapshot): string {
  if (player.role === "spectator") {
    return "Watching";
  }

  return player.ready ? "Ready" : "Waiting";
}

function renderTeamColumn(
  team: "red" | "blue",
  slots: readonly LobbySlotView[],
  localRole: string,
  canUseLobbyControls: boolean,
): string {
  const teamSlots = slots.filter((slot) => slot.team === team);
  return `
    <section class="online-team-column online-team-column--${team}" data-team-column="${team}">
      <header>
        <h2>${capitalize(team)} Team</h2>
        <span>${escapeHtml(teamControlText(teamSlots, team))}</span>
      </header>
      <div class="online-team-column__slots">
        ${teamSlots.map((slot) => renderSlotRow(slot, localRole, canUseLobbyControls)).join("")}
      </div>
    </section>
  `;
}

function renderSlotRow(
  slot: LobbySlotView,
  localRole: string,
  canUseLobbyControls: boolean,
): string {
  const editable = slot.active && canUseLobbyControls && canLocalPlayerEditSlot(localRole, slot.slotId);
  const disabled = editable ? "" : " disabled";
  return `
    <label class="${escapeHtml(slotClass(slot, editable))}">
      <div>
        <strong>${escapeHtml(slotLabel(slot.slotId))}</strong>
        <span>${escapeHtml(slotSeatText(slot))}</span>
      </div>
      <select data-slot-select="true" data-slot-id="${escapeHtml(slot.slotId)}"${disabled}>
        ${characterOptions(slot.characterId)}
      </select>
      <em>${escapeHtml(slotStateText(slot))}</em>
    </label>
  `;
}

function characterOptions(selectedCharacterId: string): string {
  return CHARACTER_OPTIONS.map((characterId) => {
    const selected = characterId === selectedCharacterId ? " selected" : "";
    return `<option value="${characterId}"${selected}>${capitalize(characterId)}</option>`;
  }).join("");
}

function teamControlText(slots: readonly LobbySlotView[], team: "red" | "blue"): string {
  const activeSlot = slots.find((slot) => slot.active);
  if (!activeSlot?.ownerSessionId) {
    return `Open ${team} captain seat`;
  }

  return `${activeSlot.displayName || capitalize(team)} controls this team`;
}

function slotSeatText(slot: LobbySlotView): string {
  if (!slot.active) {
    return "2v2 only";
  }

  if (!slot.ownerSessionId) {
    return `Open ${slot.team} captain seat`;
  }

  return slot.displayName || "Captain";
}

function slotStateText(slot: LobbySlotView): string {
  if (!slot.active) {
    return "Closed";
  }

  return slot.ready ? "Ready" : "Picking";
}

function slotClass(slot: LobbySlotView, editable: boolean): string {
  const classes = ["online-slot", `online-slot--${slot.team}`];
  if (!slot.active) {
    classes.push("online-slot--inactive");
  }
  if (editable) {
    classes.push("online-slot--editable");
  }

  return classes.join(" ");
}

function slotSortValue(slotId: string): number {
  const index = SLOT_ORDER.indexOf(slotId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
