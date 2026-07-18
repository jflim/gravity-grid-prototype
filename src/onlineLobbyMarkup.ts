import type { PlayerSnapshot } from "./onlineLobbySnapshot";
import {
  LOBBY_CHARACTER_CARDS,
  lobbyCharacterCardFor,
  type LobbyCharacterCard,
} from "./onlineLobbyCharacters";
import { ONLINE_LOBBY_MAP_OPTIONS } from "./onlineLobbyMapOptions";
import {
  canLocalPlayerEditSlot,
  localRoleLabel,
  slotLabel,
  type LobbySlotView,
} from "./onlineLobbyView";

const SLOT_ORDER = ["red-1", "blue-1", "red-2", "blue-2"];
const TEAM_ORDER = ["red", "blue"] as const;
const LEFT_FACING = -1;
const RIGHT_FACING = 1;
type SeatAction = "claim" | "pick" | "locked";

type SlotRenderState = {
  card: LobbyCharacterCard | undefined;
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
          <span class="online-panel__badge" data-status-badge>Not Joined</span>
        </div>
        <div class="online-panel__actions">
          <button type="button" class="online-panel__retry" data-auto-connect hidden>Retry Connection</button>
        </div>
        <section class="online-lobby-entry" data-join-playtest>
          <div class="online-lobby-entry__intro">
            <span>Join Playtest</span>
            <h2>Gravity Canyon</h2>
            <p>Private-room artillery playtest. Pick a Unit, take turns firing across destructible canyon terrain, and knock the other team out.</p>
          </div>
          <label class="online-lobby-entry__field">
            Display Name
            <input type="text" data-join-display-name maxlength="18" autocomplete="nickname" value="" />
          </label>
          <div class="online-panel__actions">
            <button type="button" data-join-playtest-button>Join Playtest</button>
          </div>
          <span class="online-lobby-entry__note">Name is locked after joining this room.</span>
        </section>
        <div class="online-panel__room" data-room-block hidden>
          <div class="online-lobby-layout">
            <section class="online-lobby-blue" aria-label="Lobby seats and map">
              <div class="online-lobby-roombar">
                <div class="online-lobby-roommeta">
                  <div class="online-panel__room-code">
                    <span>Room</span>
                    <strong data-room-code>Room pending</strong>
                  </div>
                </div>
                <div class="online-panel__players online-panel__players--compact" data-player-list></div>
              </div>
              <div class="online-lobby-ready" data-player-ready-panel hidden>
                <label>
                  Ready Status
                  <span data-ready-helper>Claim a seat to ready.</span>
                </label>
                <div class="online-panel__actions">
                  <button type="button" data-ready-toggle hidden>Ready</button>
                </div>
              </div>
              <div class="online-panel__slots" data-slot-list></div>
              <section class="online-map-preview" data-map-preview>
                <div class="online-map-preview__meta">
                  <span>Selected Map</span>
                  <strong data-selected-map-name>Random Map</strong>
                  <em data-selected-map-summary>Server picks from the v1 map pool.</em>
                </div>
                <div class="online-map-preview__spawns">
                  <i></i>
                  <i></i>
                </div>
              </section>
              <div class="online-map-rail" role="group" aria-label="Map - Host controls map">
                <button type="button" class="online-map-rail__arrow" data-map-rail-scroll="left" aria-label="Scroll maps left">&lt;</button>
                <div class="online-map-rail__scroller">
                  ${renderMapPickButtons()}
                </div>
                <button type="button" class="online-map-rail__arrow" data-map-rail-scroll="right" aria-label="Scroll maps right">&gt;</button>
              </div>
            </section>
            <aside class="online-lobby-console" aria-label="Room Settings">
              <h2>Room Settings</h2>
              <div class="online-lobby-console__host">
                <span>Lobby Host</span>
                <strong data-host-label>Assigning host</strong>
              </div>
              <div class="online-lobby-console__section online-lobby-mode">
                <label>
                  Match Mode
                  <span>Duel is 1v1. Doubles is 2v2.</span>
                </label>
                <div class="online-mode-toggle" role="group" aria-label="Match Mode - Host controls mode">
                  <button type="button" data-mode-choice="1v1">Duel<span>1v1</span></button>
                  <button type="button" data-mode-choice="2v2">Doubles<span>2v2</span></button>
                </div>
              </div>
              <div class="online-lobby-console__section online-lobby-setting">
                <label>
                  Rounds To Win
                  <span>One win is Best of 1. Two wins is Best of 3.</span>
                </label>
                <div class="online-mode-toggle online-setting-toggle" role="group" aria-label="Rounds To Win - Host controls match">
                  <button type="button" data-match-length-choice="best-of-1">1<span>Best of 1</span></button>
                  <button type="button" data-match-length-choice="best-of-3">2<span>Best of 3</span></button>
                </div>
              </div>
              <div class="online-lobby-console__section online-lobby-setting">
                <label>
                  Room Access
                  <span>Public rooms are future scope.</span>
                </label>
                <div class="online-room-access" role="group" aria-label="Room Access">
                  <span data-selected="true">Private Link</span>
                  <span data-disabled="true">Public</span>
                </div>
              </div>
              <div class="online-lobby-console__section online-lobby-start">
                <label>
                  Start State
                  <span>Ready seats launch the server-owned setup.</span>
                </label>
                <p class="online-panel__status" data-room-status></p>
              </div>
            </aside>
          </div>
        </div>
        <div class="online-character-picker" data-character-picker hidden>
          <section class="online-character-picker__panel" role="dialog" aria-modal="true" aria-label="Choose character">
            <header>
              <div>
                <span>Choose Unit</span>
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

export function renderPlayerRows(
  players: readonly PlayerSnapshot[],
  localSessionId: string,
  slots: readonly LobbySlotView[] = [],
): string {
  return players.map((player) => renderPlayerRow(player, localSessionId, slots)).join("");
}

export function renderSlotRows(
  slots: readonly LobbySlotView[],
  localSessionId: string,
  phase: string,
  hostSessionId = "",
): string {
  const sortedSlots = [...slots].sort((left, right) => slotSortValue(left.slotId) - slotSortValue(right.slotId));
  const canUseLobbyControls = phase === "lobby" || phase === "ready";
  const localHasActiveSeat = sortedSlots.some(
    (slot) => slot.active && slot.ownerSessionId.length > 0 && slot.ownerSessionId === localSessionId,
  );
  return TEAM_ORDER.map((team) =>
    renderTeamColumn(team, sortedSlots, localSessionId, canUseLobbyControls, localHasActiveSeat, hostSessionId),
  ).join("");
}

export function renderCharacterPickerOptions(selectedCharacterId: string): string {
  return LOBBY_CHARACTER_CARDS.map((card) => renderCharacterChoice(card, selectedCharacterId)).join("");
}

function renderMapPickButtons(): string {
  return ONLINE_LOBBY_MAP_OPTIONS.map((option) => {
    const mapClass = option.random ? "online-map-card online-map-card--random" : "online-map-card";
    return `
      <button type="button" class="${mapClass}" data-map-pick-choice="${escapeHtml(option.id)}">
        <span class="online-map-card__thumb"></span>
        <strong>${escapeHtml(option.name)}</strong>
        <span>${escapeHtml(option.tacticalRole)}</span>
      </button>
    `;
  }).join("");
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

function renderPlayerRow(player: PlayerSnapshot, localSessionId: string, slots: readonly LobbySlotView[]): string {
  return `
    <div class="online-player online-player--${escapeHtml(player.team)}">
      <div>
        <strong>${escapeHtml(player.displayName)}</strong>
        <span>${escapeHtml(playerRoleText(player, localSessionId))}</span>
      </div>
      <em>${escapeHtml(playerStateText(player, slots))}</em>
    </div>
  `;
}

function playerRoleText(player: PlayerSnapshot, localSessionId: string): string {
  const roleLabel = localRoleLabel(player.role);
  return player.sessionId === localSessionId ? `${roleLabel} - You` : roleLabel;
}

function playerStateText(player: PlayerSnapshot, slots: readonly LobbySlotView[]): string {
  if (player.role === "spectator") {
    return "Watching";
  }

  return playerReadyForDisplay(player, slots) ? "Ready" : "Waiting";
}

function playerReadyForDisplay(player: PlayerSnapshot, slots: readonly LobbySlotView[]): boolean {
  if (slots.length === 0) {
    return player.ready;
  }

  return slots.some((slot) => slot.ownerSessionId === player.sessionId && isSlotReadyForDisplay(slot));
}

function renderTeamColumn(
  team: "red" | "blue",
  slots: readonly LobbySlotView[],
  localSessionId: string,
  canUseLobbyControls: boolean,
  localHasActiveSeat: boolean,
  hostSessionId: string,
): string {
  const teamSlots = slots.filter((slot) => slot.team === team);
  return `
    <section class="online-team-column online-team-column--${team}" data-team-column="${team}">
      <header>
        <h2>${capitalize(team)} Team</h2>
        <span>${escapeHtml(teamControlText(teamSlots, team))}</span>
      </header>
      <div class="online-team-column__slots">
        ${teamSlots
          .map((slot) => renderSlotRow(slot, localSessionId, canUseLobbyControls, localHasActiveSeat, hostSessionId))
          .join("")}
      </div>
    </section>
  `;
}

function renderSlotRow(
  slot: LobbySlotView,
  localSessionId: string,
  canUseLobbyControls: boolean,
  localHasActiveSeat: boolean,
  hostSessionId: string,
): string {
  const state = slotRenderState(slot, localSessionId, canUseLobbyControls, localHasActiveSeat);
  return `
    <article class="${escapeHtml(slotClass(slot, state.ownedByLocal, state.canClaim, Boolean(state.card)))}" data-slot-id="${escapeHtml(slot.slotId)}">
      ${renderSeatUnit(state.card, targetFacingForSlot(slot))}
      <div class="online-seat__body">
        <div class="online-seat__topline">
          <div class="online-seat__identity">
            <strong>${escapeHtml(slotLabel(slot.slotId))}</strong>
            ${renderSeatName(slot)}
          </div>
          <div class="online-seat__state" aria-label="Seat status">
            ${renderSeatStatusChips(slot, hostSessionId)}
          </div>
        </div>
        ${renderUnitSummary(slot, state.card)}
        ${renderSeatAction(state.action, slot, state.disabled)}
      </div>
    </article>
  `;
}

function renderSeatAction(action: SeatAction, slot: LobbySlotView, disabled: string): string {
  if (isQuietOpenSeatAction(action, slot)) {
    return `<span class="online-seat__action-spacer" aria-hidden="true"></span>`;
  }

  return `
    <button type="button" data-seat-action="${action}" data-slot-id="${escapeHtml(slot.slotId)}"${disabled}>
      ${escapeHtml(actionLabel(action, slot))}
    </button>
  `;
}

function isQuietOpenSeatAction(action: SeatAction, slot: LobbySlotView): boolean {
  return action === "locked" && slot.active && !slot.ownerSessionId;
}

function renderSeatStatusChips(slot: LobbySlotView, hostSessionId: string): string {
  return [slotHostBadge(slot, hostSessionId), slotReadyBadge(slot), slotProgressBadge(slot)]
    .filter((badge) => badge.length > 0)
    .join("");
}

function slotHostBadge(slot: LobbySlotView, hostSessionId: string): string {
  if (!hostSessionId || slot.ownerSessionId !== hostSessionId) {
    return "";
  }

  return renderSeatStatusChip("host online-seat__host-badge", "Lobby Host", "Host");
}

function slotReadyBadge(slot: LobbySlotView): string {
  if (!isSlotReadyForDisplay(slot)) {
    return "";
  }

  return renderSeatStatusChip("ready", "Ready", "Ready");
}

function slotProgressBadge(slot: LobbySlotView): string {
  if (isSlotReadyForDisplay(slot)) {
    return "";
  }

  const stateText = slotStateText(slot);
  return renderSeatStatusChip("muted", stateText, stateText);
}

function renderSeatStatusChip(tone: string, label: string, text: string): string {
  const toneClasses = tone
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => (part.startsWith("online-") ? part : `online-seat__status-chip--${part}`))
    .join(" ");
  return `
    <span class="online-seat__status-chip ${toneClasses}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
      <i aria-hidden="true"></i>
      <span>${escapeHtml(text)}</span>
    </span>
  `;
}

function slotRenderState(
  slot: LobbySlotView,
  localSessionId: string,
  canUseLobbyControls: boolean,
  localHasActiveSeat: boolean,
): SlotRenderState {
  const ownedByLocal = canLocalPlayerEditSlot(slot.ownerSessionId, localSessionId);
  const canClaim = canClaimSlot(slot, canUseLobbyControls, localHasActiveSeat);
  const action = seatAction(slot, canClaim, canPickSlot(slot, canUseLobbyControls, ownedByLocal));
  return {
    card: visibleCharacterCard(slot),
    ownedByLocal,
    canClaim,
    action,
    disabled: disabledAttribute(action),
  };
}

function visibleCharacterCard(slot: LobbySlotView): LobbyCharacterCard | undefined {
  return slotHasDisplayUnit(slot) ? lobbyCharacterCardFor(slot.characterId) : undefined;
}

function slotHasDisplayUnit(slot: LobbySlotView): boolean {
  return slot.active && Boolean(slot.ownerSessionId) && (slot.characterSelected || slot.ready);
}

function renderSeatUnit(card: LobbyCharacterCard | undefined, targetFacing: number): string {
  if (!card) {
    return `
      <div class="online-seat__unit online-seat__unit--empty" aria-hidden="true"></div>
    `;
  }

  return `
    <div class="${escapeHtml(unitFacingClass("online-seat__unit", card.unitImageFaces, targetFacing))}" data-unit-source-facing="${card.unitImageFaces}" data-unit-target-facing="${targetFacing}">
      <img src="${escapeHtml(card.unitImage)}" alt="${escapeHtml(`${card.name} unit art`)}" loading="eager" />
    </div>
  `;
}

function renderSeatName(slot: LobbySlotView): string {
  const seatName = slotSeatText(slot);
  return `
    <span class="online-seat__name-stack">
      <span class="online-seat__name-row">
        <span data-seat-display-name>${escapeHtml(seatName)}</span>
      </span>
    </span>
  `;
}

function renderUnitSummary(slot: LobbySlotView, card: LobbyCharacterCard | undefined): string {
  if (card) {
    return renderUnitChips(card);
  }

  if (slot.ownerSessionId) {
    return `<div class="online-seat__unit-empty">${escapeHtml("Choose a unit to ready.")}</div>`;
  }

  return `<div class="online-seat__unit-empty online-seat__unit-empty--quiet" aria-hidden="true"></div>`;
}

function renderUnitChips(card: LobbyCharacterCard): string {
  return `
    <div class="online-seat__unit-chips" aria-label="${escapeHtml(`${card.name} with ${card.vehicleName}`)}">
      <span class="online-seat__unit-chip" data-unit-chip="pilot" title="${escapeHtml(`Pilot: ${card.name}`)}">${escapeHtml(card.name)}</span>
      <span class="online-seat__unit-chip" data-unit-chip="vehicle" title="${escapeHtml(`Vehicle: ${card.vehicleName}`)}">${escapeHtml(card.vehicleName)}</span>
    </div>
  `;
}

function renderCharacterChoice(card: LobbyCharacterCard, selectedCharacterId: string): string {
  const selected = card.characterId === selectedCharacterId;
  return `
    <button type="button" class="online-character-choice${selected ? " online-character-choice--selected" : ""}" data-character-choice="${escapeHtml(card.characterId)}">
      <span class="${escapeHtml(unitFacingClass("online-character-choice__unit", card.unitImageFaces, LEFT_FACING))}" data-unit-source-facing="${card.unitImageFaces}" data-unit-target-facing="${LEFT_FACING}">
        <img src="${escapeHtml(card.unitImage)}" alt="${escapeHtml(`${card.name} unit art`)}" loading="eager" />
      </span>
      <span class="online-character-choice__meta">
        <strong>${escapeHtml(card.name)}</strong>
        <span>${escapeHtml(`Vehicle: ${card.vehicleName}`)}</span>
      </span>
      <span class="online-character-choice__context">
        <span class="online-character-choice__role-line">
          <strong>${escapeHtml(card.roleName)}</strong>
          <em data-context-status="${escapeHtml(card.contextStatusTone)}">${escapeHtml(card.contextStatus)}</em>
        </span>
        <span class="online-character-choice__summary">${escapeHtml(card.playstyleSummary)}</span>
        <span class="online-character-choice__strengths" aria-label="${escapeHtml(`${card.name} strengths`)}">
          ${renderStrengthChips(card.strengths)}
        </span>
      </span>
      <span class="online-character-choice__parts">
        <img src="${escapeHtml(card.pilotImage)}" alt="${escapeHtml(`${card.name} pilot`)}" loading="eager" />
        <img src="${escapeHtml(card.vehicleImage)}" alt="${escapeHtml(`${card.vehicleName} vehicle`)}" loading="eager" />
      </span>
    </button>
  `;
}

function renderStrengthChips(strengths: readonly string[]): string {
  return strengths
    .map((strength) => `<span class="online-character-choice__strength">${escapeHtml(strength)}</span>`)
    .join("");
}

function targetFacingForSlot(slot: LobbySlotView): number {
  return slot.team === "blue" ? LEFT_FACING : RIGHT_FACING;
}

function unitFacingClass(baseClass: string, sourceFacing: number, targetFacing: number): string {
  return sourceFacing === targetFacing ? baseClass : `${baseClass} ${baseClass}--mirrored`;
}

function teamControlText(slots: readonly LobbySlotView[], team: "red" | "blue"): string {
  const activeSlots = slots.filter((slot) => slot.active);
  const openCount = activeSlots.filter((slot) => !slot.ownerSessionId).length;
  if (openCount > 0) {
    return `${openCount} open ${team} seat${openCount === 1 ? "" : "s"}`;
  }

  const readyCount = activeSlots.filter(isSlotReadyForDisplay).length;
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
  return slotStateRules.find((rule) => rule.matches(slot))?.label ?? readySlotStateLabels.get(slot.ready) ?? "Picking";
}

type SlotStateRule = {
  label: string;
  matches: (slot: LobbySlotView) => boolean;
};

const slotStateRules: readonly SlotStateRule[] = [
  { label: "Closed", matches: (slot) => !slot.active },
  { label: "Open", matches: (slot) => !slot.ownerSessionId },
  { label: "Choose Unit", matches: (slot) => !slotHasDisplayUnit(slot) },
];

const readySlotStateLabels = new Map<boolean, string>([
  [true, "Ready"],
  [false, "Picking"],
]);

function seatAction(slot: LobbySlotView, canClaim: boolean, canPick: boolean): SeatAction {
  if (canPick) {
    return "pick";
  }

  if (canClaim) {
    return "claim";
  }

  return "locked";
}

function canClaimSlot(slot: LobbySlotView, canUseLobbyControls: boolean, localHasActiveSeat: boolean): boolean {
  return slot.active ? canUseLobbyControls && !localHasActiveSeat && !slot.ownerSessionId : false;
}

function canPickSlot(slot: LobbySlotView, canUseLobbyControls: boolean, ownedByLocal: boolean): boolean {
  return slot.active ? canUseLobbyControls && ownedByLocal : false;
}

function disabledAttribute(action: SeatAction): string {
  return action === "locked" ? " disabled" : "";
}

function actionLabel(action: SeatAction, slot: LobbySlotView): string {
  return actionLabelRules.find((rule) => rule.matches(action, slot))?.label(slot) ?? fallbackActionLabel(action, slot);
}

function lockedActionLabel(slot: LobbySlotView): string {
  if (slot.ownerSessionId) {
    return "Occupied";
  }

  return slot.active ? "Open Seat" : "Closed";
}

function fallbackActionLabel(action: SeatAction, slot: LobbySlotView): string {
  return action === "locked" ? lockedActionLabel(slot) : activeActionLabels[action];
}

const activeActionLabels: Record<Exclude<SeatAction, "locked">, string> = {
  claim: "Claim Seat",
  pick: "Change Unit",
};

type ActionLabelRule = {
  label: (slot: LobbySlotView) => string;
  matches: (action: SeatAction, slot: LobbySlotView) => boolean;
};

const actionLabelRules: readonly ActionLabelRule[] = [
  { label: () => "Closed", matches: (_action, slot) => !slot.active },
  { label: () => "Choose Unit", matches: (action, slot) => action === "pick" && !slotHasDisplayUnit(slot) },
];

function slotClass(
  slot: LobbySlotView,
  ownedByLocal: boolean,
  claimable: boolean,
  hasVisibleCharacter: boolean,
): string {
  return [
    "online-slot",
    `online-slot--${slot.team}`,
    classWhen(!slot.active, "online-slot--inactive"),
    classWhen(!hasVisibleCharacter, "online-slot--empty-character"),
    classWhen(ownedByLocal, "online-slot--owned"),
    classWhen(claimable, "online-slot--claimable"),
    classWhen(isSlotReadyForDisplay(slot), "online-slot--ready"),
  ]
    .filter((className) => className.length > 0)
    .join(" ");
}

function isSlotReadyForDisplay(slot: LobbySlotView): boolean {
  return slot.ready && slotHasDisplayUnit(slot);
}

function classWhen(condition: boolean, className: string): string {
  return condition ? className : "";
}

function slotSortValue(slotId: string): number {
  const index = SLOT_ORDER.indexOf(slotId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
