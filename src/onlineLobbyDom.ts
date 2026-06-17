import {
  renderCharacterPickerOptions,
  renderLobbyShell,
  renderPlayerRows,
  renderSlotRows,
} from "./onlineLobbyMarkup";
import type { PlayerSnapshot, RoomSnapshot } from "./onlineLobbySnapshot";
import {
  canLocalPlayerChangeMode,
  canLocalPlayerUseLobbyControls,
  lobbyHostLabel,
  lobbyStatusText,
  modeLabel,
  modeSubLabel,
  roomDisplayLabel,
} from "./onlineLobbyView";

export type OnlineLobbyDomHandlers = {
  reconnect: () => void;
  displayNameChanged: (value: string) => void;
  modeChanged: (mode: string) => void;
  seatClaimed: (slotId: string) => void;
  characterSelected: (slotId: string, characterId: string) => void;
  readyClicked: () => void;
};

export type BadgeTone = "neutral" | "ok" | "warn" | "error";

export type OnlineLobbyDom = {
  stage: HTMLElement;
  displayName: () => string;
  setBadge: (text: string, tone: BadgeTone) => void;
  renderLobby: (snapshot: RoomSnapshot, localSessionId: string, localReady: boolean, fallbackRoomId?: string) => void;
  remove: () => void;
};

type LobbyRenderModel = {
  isHost: boolean;
  canChangeMode: boolean;
  canUseLobbyControls: boolean;
  effectiveReady: boolean;
  statusText: string;
};

export function createOnlineLobbyDom(documentRef: Document, handlers: OnlineLobbyDomHandlers): OnlineLobbyDom {
  const stage = createOnlineLobbyStage(documentRef);
  const displayNameInput = stage.querySelector<HTMLInputElement>("#display-name");
  const reconnectButton = stage.querySelector<HTMLButtonElement>("[data-auto-connect]");
  const readyButton = stage.querySelector<HTMLButtonElement>("[data-ready-toggle]");
  const modeButtons = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-mode-choice]"));
  const roomBlock = stage.querySelector<HTMLElement>("[data-room-block]");
  const roomCodeLabel = stage.querySelector<HTMLElement>("[data-room-code]");
  const hostLabel = stage.querySelector<HTMLElement>("[data-host-label]");
  const statusBadge = stage.querySelector<HTMLElement>("[data-status-badge]");
  const roomStatus = stage.querySelector<HTMLElement>("[data-room-status]");
  const playerList = stage.querySelector<HTMLElement>("[data-player-list]");
  const slotList = stage.querySelector<HTMLElement>("[data-slot-list]");
  const picker = stage.querySelector<HTMLElement>("[data-character-picker]");
  const pickerSlot = stage.querySelector<HTMLElement>("[data-character-picker-slot]");
  const pickerOptions = stage.querySelector<HTMLElement>("[data-character-picker-options]");
  let activePickerSlotId = "";
  let latestSnapshot: RoomSnapshot | undefined;
  let latestLocalSessionId = "";

  reconnectButton?.addEventListener("click", () => handlers.reconnect());
  displayNameInput?.addEventListener("change", () => handlers.displayNameChanged(displayNameInput.value));
  readyButton?.addEventListener("click", () => handlers.readyClicked());

  for (const modeButton of modeButtons) {
    modeButton.addEventListener("click", () => handlers.modeChanged(modeButton.dataset.modeChoice ?? "2v2"));
  }

  stage.addEventListener("click", handleStageClick);

  return {
    stage,
    displayName: () => displayNameInput?.value ?? "Guest",
    setBadge,
    renderLobby,
    remove: () => stage.remove(),
  };

  function setBadge(text: string, tone: BadgeTone): void {
    if (!statusBadge) {
      return;
    }

    statusBadge.textContent = text;
    statusBadge.dataset.tone = tone;
    if (reconnectButton) {
      reconnectButton.hidden = tone !== "error" && text !== "Offline";
    }
  }

  function renderLobby(
    snapshot: RoomSnapshot,
    localSessionId: string,
    localReady: boolean,
    fallbackRoomId = "",
  ): void {
    latestSnapshot = snapshot;
    latestLocalSessionId = localSessionId;
    const model = lobbyRenderModel(snapshot, localSessionId, localReady);

    showRoomBlock(roomBlock);
    setElementText(roomCodeLabel, roomDisplayLabel(snapshot.roomCode, fallbackRoomId));
    setElementText(hostLabel, lobbyHostLabel(snapshot.players, snapshot.hostSessionId, localSessionId));
    setElementText(roomStatus, model.statusText);
    renderReadyButton(readyButton, model);
    renderModeButtons(modeButtons, snapshot.mode, model);
    setElementHtml(playerList, renderPlayerRows(snapshot.players, localSessionId));
    setElementHtml(slotList, renderSlotRows(snapshot.slots, localSessionId, snapshot.phase));
    syncOpenPicker(snapshot);
  }

  function handleSeatAction(button: HTMLElement): void {
    const slotId = button.dataset.slotId ?? "";
    if (!slotId) {
      return;
    }

    handleSeatActionType(slotId, button.dataset.seatAction);
  }

  function openPicker(slotId: string): void {
    activePickerSlotId = slotId;
    syncOpenPicker(latestSnapshot);
    if (picker) {
      picker.hidden = false;
    }
  }

  function closePicker(): void {
    activePickerSlotId = "";
    if (picker) {
      picker.hidden = true;
    }
  }

  function syncOpenPicker(snapshot: RoomSnapshot | undefined): void {
    const slot = editablePickerSlot(snapshot);
    if (!slot) {
      return;
    }

    setElementText(pickerSlot, slot.slotId);
    setElementHtml(pickerOptions, renderCharacterPickerOptions(slot.characterId));
    showPicker();
  }

  function handleStageClick(event: MouseEvent): void {
    const target = eventTargetElement(event.target);
    if (!target) {
      return;
    }

    handleLobbyClickTarget(target);
  }

  function handleLobbyClickTarget(target: HTMLElement): void {
    if (handleSeatClick(target) || handleCharacterClick(target)) {
      return;
    }

    closePickerIfRequested(target);
  }

  function handleSeatClick(target: HTMLElement): boolean {
    const seatButton = target.closest<HTMLElement>("[data-seat-action]");
    if (!seatButton) {
      return false;
    }

    handleSeatAction(seatButton);
    return true;
  }

  function handleCharacterClick(target: HTMLElement): boolean {
    const characterButton = target.closest<HTMLElement>("[data-character-choice]");
    if (!characterButton) {
      return false;
    }

    selectCharacter(characterButton.dataset.characterChoice ?? "");
    return true;
  }

  function selectCharacter(characterId: string): void {
    if (!activePickerSlotId || !characterId) {
      return;
    }

    handlers.characterSelected(activePickerSlotId, characterId);
    closePicker();
  }

  function claimSeat(slotId: string): void {
    activePickerSlotId = slotId;
    handlers.seatClaimed(slotId);
  }

  function editablePickerSlot(snapshot: RoomSnapshot | undefined) {
    if (!canSyncPicker(snapshot)) {
      return undefined;
    }

    return editablePickerSlotOrClose(snapshot);
  }

  function showPicker(): void {
    if (picker) {
      picker.hidden = false;
    }
  }

  function handleSeatActionType(slotId: string, action: string | undefined): void {
    if (action === "claim") {
      claimSeat(slotId);
      return;
    }

    if (action === "pick") {
      openPicker(slotId);
    }
  }

  function closePickerIfRequested(target: HTMLElement): void {
    if (target.closest("[data-character-picker-close]")) {
      closePicker();
    }
  }

  function canSyncPicker(snapshot: RoomSnapshot | undefined): snapshot is RoomSnapshot {
    return Boolean(snapshot && activePickerSlotId && pickerOptions);
  }

  function editablePickerSlotOrClose(snapshot: RoomSnapshot) {
    const slot = snapshot.slots.find((candidate) => candidate.slotId === activePickerSlotId);
    if (pickerSlotIsEditable(slot)) {
      return slot;
    }

    closePicker();
    return undefined;
  }

  function pickerSlotIsEditable(slot: RoomSnapshot["slots"][number] | undefined): boolean {
    return Boolean(slot && slot.ownerSessionId === latestLocalSessionId);
  }
}

function eventTargetElement(target: EventTarget | null): HTMLElement | undefined {
  return target instanceof HTMLElement ? target : undefined;
}

function createOnlineLobbyStage(documentRef: Document): HTMLElement {
  const template = documentRef.createElement("template");
  template.innerHTML = renderLobbyShell().trim();
  const stage = template.content.firstElementChild;
  if (!(stage instanceof HTMLElement)) {
    throw new Error("Online lobby shell did not render.");
  }

  return stage;
}

function lobbyRenderModel(
  snapshot: RoomSnapshot,
  localSessionId: string,
  localReady: boolean,
): LobbyRenderModel {
  const localPlayer = playerBySessionId(snapshot.players, localSessionId);
  const hasOwnedActiveSeat = snapshot.slots.some((slot) => slot.active && slot.ownerSessionId === localSessionId);
  return {
    isHost: snapshot.hostSessionId === localSessionId,
    canChangeMode: canLocalPlayerChangeMode(snapshot.hostSessionId === localSessionId, snapshot.phase),
    canUseLobbyControls: canLocalPlayerUseLobbyControls(hasOwnedActiveSeat, snapshot.phase),
    effectiveReady: playerReady(localPlayer, localReady),
    statusText: roomStatusText(snapshot),
  };
}

function roomStatusText(snapshot: RoomSnapshot): string {
  const host = playerBySessionId(snapshot.players, snapshot.hostSessionId);
  const openSeatCount = snapshot.slots.filter((slot) => slot.active && !slot.ownerSessionId).length;
  const nextUnreadySlot = snapshot.slots.find(
    (slot) => slot.active && slot.ownerSessionId && !playerBySessionId(snapshot.players, slot.ownerSessionId)?.ready,
  );
  const nextReadyPlayer = playerBySessionId(snapshot.players, nextUnreadySlot?.ownerSessionId ?? "");
  return `${modeLabel(snapshot.mode)} - ${modeSubLabel(snapshot.mode)} - ${lobbyStatusText({
    status: snapshot.status,
    hostName: playerName(host),
    openSeatCount,
    nextReadyName: playerName(nextReadyPlayer),
  })}`;
}

function playerBySessionId(players: readonly PlayerSnapshot[], sessionId: string): PlayerSnapshot | undefined {
  return players.find((player) => player.sessionId === sessionId);
}

function playerName(player: PlayerSnapshot | undefined): string {
  return player ? player.displayName : "";
}

function playerReady(player: PlayerSnapshot | undefined, fallback: boolean): boolean {
  return player ? player.ready : fallback;
}

function showRoomBlock(roomBlock: HTMLElement | null): void {
  if (roomBlock) {
    roomBlock.hidden = false;
  }
}

function setElementText(element: HTMLElement | null, text: string): void {
  if (element) {
    element.textContent = text;
  }
}

function setElementHtml(element: HTMLElement | null, html: string): void {
  if (element) {
    element.innerHTML = html;
  }
}

function renderReadyButton(button: HTMLButtonElement | null, model: LobbyRenderModel): void {
  if (!button) {
    return;
  }

  button.textContent = model.effectiveReady ? "Unready" : "Ready";
  button.disabled = !model.canUseLobbyControls;
}

function renderModeButtons(buttons: readonly HTMLButtonElement[], mode: string, model: LobbyRenderModel): void {
  for (const button of buttons) {
    const selected = button.dataset.modeChoice === mode;
    button.disabled = !model.canChangeMode;
    button.dataset.selected = selected ? "true" : "false";
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.title = modeButtonTitle(model);
  }
}

function modeButtonTitle(model: LobbyRenderModel): string {
  if (model.canChangeMode) {
    return "Choose the playtest mode.";
  }

  if (!model.isHost) {
    return "Only the lobby host can change mode.";
  }

  return "Mode is locked after gameplay starts.";
}
