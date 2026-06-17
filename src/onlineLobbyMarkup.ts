import type { PlayerSnapshot } from "./onlineLobbySnapshot";
import {
  LOBBY_CHARACTER_CARDS,
  lobbyCharacterCardFor,
  type LobbyCharacterCard,
} from "./onlineLobbyCharacters";
import {
  canLocalPlayerEditSlot,
  localRoleLabel,
  slotLabel,
  type LobbySlotView,
} from "./onlineLobbyView";

const SLOT_ORDER = ["red-1", "blue-1", "red-2", "blue-2"];
const TEAM_ORDER = ["red", "blue"] as const;
type SeatAction = "claim" | "pick" | "locked";

type SlotRenderState = {
  card: LobbyCharacterCard;
  ownedByLocal: boolean;
  canClaim: boolean;
  action: SeatAction;
  disabled: string;
};

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
            <div class="online-lobby-roommeta">
              <div class="online-panel__room-code">
                <span>Room</span>
                <strong data-room-code>Room pending</strong>
              </div>
              <div class="online-panel__room-code online-panel__host">
                <span>Lobby Host</span>
                <strong data-host-label>Assigning host</strong>
              </div>
            </div>
            <div class="online-lobby-mode">
              <label>
                Mode
                <span>Host controls mode</span>
              </label>
              <div class="online-mode-toggle" role="group" aria-label="Mode - Host controls mode">
                <button type="button" data-mode-choice="1v1">Duel<span>1 fighter per side</span></button>
                <button type="button" data-mode-choice="2v2">Doubles<span>2 fighters per side</span></button>
              </div>
            </div>
          </div>
          <p class="online-panel__status" data-room-status></p>
          <div class="online-panel__players" data-player-list></div>
          <div class="online-panel__slots" data-slot-list></div>
          <div class="online-panel__actions">
            <button type="button" data-ready-toggle>Ready</button>
          </div>
        </div>
        <div class="online-character-picker" data-character-picker hidden>
          <section class="online-character-picker__panel" role="dialog" aria-modal="true" aria-label="Choose character">
            <header>
              <div>
                <span>Choose Fighter</span>
                <strong data-character-picker-slot>Seat</strong>
              </div>
              <button type="button" data-character-picker-close aria-label="Close character picker">Close</button>
            </header>
            <div class="online-character-picker__options" data-character-picker-options></div>
          </section>
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
  localSessionId: string,
  phase: string,
): string {
  const sortedSlots = [...slots].sort((left, right) => slotSortValue(left.slotId) - slotSortValue(right.slotId));
  const canUseLobbyControls = phase === "lobby" || phase === "ready";
  return TEAM_ORDER.map((team) => renderTeamColumn(team, sortedSlots, localSessionId, canUseLobbyControls)).join("");
}

export function renderCharacterPickerOptions(selectedCharacterId: string): string {
  return LOBBY_CHARACTER_CARDS.map((card) => renderCharacterChoice(card, selectedCharacterId)).join("");
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
  localSessionId: string,
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
        ${teamSlots.map((slot) => renderSlotRow(slot, localSessionId, canUseLobbyControls)).join("")}
      </div>
    </section>
  `;
}

function renderSlotRow(
  slot: LobbySlotView,
  localSessionId: string,
  canUseLobbyControls: boolean,
): string {
  const state = slotRenderState(slot, localSessionId, canUseLobbyControls);
  return `
    <article class="${escapeHtml(slotClass(slot, state.ownedByLocal, state.canClaim))}" data-slot-id="${escapeHtml(slot.slotId)}">
      <div class="online-seat__unit">
        <img src="${escapeHtml(state.card.unitImage)}" alt="${escapeHtml(`${state.card.name} unit art`)}" loading="eager" />
      </div>
      <div class="online-seat__body">
        <div class="online-seat__topline">
          <div>
            <strong>${escapeHtml(slotLabel(slot.slotId))}</strong>
            <span>${escapeHtml(slotSeatText(slot))}</span>
          </div>
          <em>${escapeHtml(slotStateText(slot))}</em>
        </div>
        <div class="online-seat__loadout">
          ${renderLoadoutPart("Pilot", state.card.name, state.card.pilotImage, state.card.needsLobbyArt)}
          ${renderLoadoutPart("Ride", state.card.rideName, state.card.rideImage, false)}
        </div>
        <button type="button" data-seat-action="${state.action}" data-slot-id="${escapeHtml(slot.slotId)}"${state.disabled}>
          ${escapeHtml(actionLabel(state.action, slot))}
        </button>
      </div>
    </article>
  `;
}

function slotRenderState(
  slot: LobbySlotView,
  localSessionId: string,
  canUseLobbyControls: boolean,
): SlotRenderState {
  const ownedByLocal = canLocalPlayerEditSlot(slot.ownerSessionId, localSessionId);
  const canClaim = canClaimSlot(slot, canUseLobbyControls);
  const action = seatAction(slot, canClaim, canPickSlot(slot, canUseLobbyControls, ownedByLocal));
  return {
    card: lobbyCharacterCardFor(slot.characterId),
    ownedByLocal,
    canClaim,
    action,
    disabled: disabledAttribute(action),
  };
}

function renderLoadoutPart(label: string, value: string, image: string, needsLobbyArt: boolean): string {
  return `
    <figure class="online-seat__part">
      <img src="${escapeHtml(image)}" alt="${escapeHtml(`${value} ${label.toLowerCase()}`)}" loading="eager" />
      <figcaption>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        ${needsLobbyArt ? "<em>Lobby art needed</em>" : ""}
      </figcaption>
    </figure>
  `;
}

function renderCharacterChoice(card: LobbyCharacterCard, selectedCharacterId: string): string {
  const selected = card.characterId === selectedCharacterId;
  return `
    <button type="button" class="online-character-choice${selected ? " online-character-choice--selected" : ""}" data-character-choice="${escapeHtml(card.characterId)}">
      <span class="online-character-choice__unit">
        <img src="${escapeHtml(card.unitImage)}" alt="${escapeHtml(`${card.name} unit art`)}" loading="eager" />
      </span>
      <span class="online-character-choice__meta">
        <strong>${escapeHtml(card.name)}</strong>
        <span>${escapeHtml(card.rideName)}</span>
      </span>
      <span class="online-character-choice__parts">
        <img src="${escapeHtml(card.pilotImage)}" alt="${escapeHtml(`${card.name} pilot`)}" loading="eager" />
        <img src="${escapeHtml(card.rideImage)}" alt="${escapeHtml(`${card.rideName} ride`)}" loading="eager" />
      </span>
    </button>
  `;
}

function teamControlText(slots: readonly LobbySlotView[], team: "red" | "blue"): string {
  const activeSlots = slots.filter((slot) => slot.active);
  const openCount = activeSlots.filter((slot) => !slot.ownerSessionId).length;
  if (openCount > 0) {
    return `${openCount} open ${team} seat${openCount === 1 ? "" : "s"}`;
  }

  const readyCount = activeSlots.filter((slot) => slot.ready).length;
  return `${capitalize(team)} is ${readyCount === activeSlots.length ? "ready" : "picking"}`;
}

function slotSeatText(slot: LobbySlotView): string {
  if (!slot.active) {
    return "2v2 only";
  }

  if (!slot.ownerSessionId) {
    return `Open ${slot.team} seat`;
  }

  return slot.displayName || "Player";
}

function slotStateText(slot: LobbySlotView): string {
  if (!slot.active) {
    return "Closed";
  }

  return slot.ready ? "Ready" : "Picking";
}

function seatAction(slot: LobbySlotView, canClaim: boolean, canPick: boolean): SeatAction {
  if (canPick) {
    return "pick";
  }

  if (canClaim) {
    return "claim";
  }

  return "locked";
}

function canClaimSlot(slot: LobbySlotView, canUseLobbyControls: boolean): boolean {
  return slot.active ? canUseLobbyControls && !slot.ownerSessionId : false;
}

function canPickSlot(slot: LobbySlotView, canUseLobbyControls: boolean, ownedByLocal: boolean): boolean {
  return slot.active ? canUseLobbyControls && ownedByLocal : false;
}

function disabledAttribute(action: SeatAction): string {
  return action === "locked" ? " disabled" : "";
}

function actionLabel(action: SeatAction, slot: LobbySlotView): string {
  if (!slot.active) {
    return "Closed";
  }

  return action === "locked" ? lockedActionLabel(slot) : activeActionLabels[action];
}

function lockedActionLabel(slot: LobbySlotView): string {
  return slot.ownerSessionId ? "Occupied" : "Closed";
}

const activeActionLabels: Record<Exclude<SeatAction, "locked">, string> = {
  claim: "Claim Seat",
  pick: "Change Fighter",
};

function slotClass(slot: LobbySlotView, ownedByLocal: boolean, claimable: boolean): string {
  const classes = ["online-slot", `online-slot--${slot.team}`];
  if (!slot.active) {
    classes.push("online-slot--inactive");
  }
  if (ownedByLocal) {
    classes.push("online-slot--owned");
  }
  if (claimable) {
    classes.push("online-slot--claimable");
  }

  return classes.join(" ");
}

function slotSortValue(slotId: string): number {
  const index = SLOT_ORDER.indexOf(slotId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
