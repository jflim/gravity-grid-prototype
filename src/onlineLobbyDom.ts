import {
  renderCharacterPickerOptions,
  renderLobbyShell,
  renderPlayerRows,
  renderSlotRows,
} from "./onlineLobbyMarkup";
import type { PlayerSnapshot, RoomSnapshot } from "./onlineLobbySnapshot";
import {
  canLocalPlayerChangeMode,
  canLocalPlayerChangeRoomSettings,
  canLocalPlayerUseLobbyControls,
  lobbyHostLabel,
  lobbyStatusText,
  mapPickLabel,
  mapPickSummaryLabel,
  matchLengthLabel,
  modeLabel,
  modeSubLabel,
  roomDisplayLabel,
  type LobbySlotView,
} from "./onlineLobbyView";

export type OnlineLobbyDomHandlers = {
  reconnect: () => void;
  joinPlaytest: (displayName: string) => void;
  modeChanged: (mode: string) => void;
  matchLengthChanged: (matchLength: string) => void;
  mapPickChanged: (mapPick: string) => void;
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
  canChangeRoomSettings: boolean;
  canUseLobbyControls: boolean;
  canReady: boolean;
  effectiveReady: boolean;
  statusText: string;
};

type ReadyControlPresentation = {
  buttonDisabled: boolean;
  buttonHidden: boolean;
  buttonText: string;
  helperText: string;
  panelHidden: boolean;
};

type SeatActionIntent = "claim-seat" | "open-picker" | "none";

export function lobbySeatActionIntent(action: string | undefined): SeatActionIntent {
  if (action === "claim") {
    return "claim-seat";
  }

  if (action === "pick") {
    return "open-picker";
  }

  return "none";
}

export function createOnlineLobbyDom(documentRef: Document, handlers: OnlineLobbyDomHandlers): OnlineLobbyDom {
  const stage = createOnlineLobbyStage(documentRef);
  const reconnectButton = stage.querySelector<HTMLButtonElement>("[data-auto-connect]");
  const joinBlock = stage.querySelector<HTMLElement>("[data-join-playtest]");
  const joinDisplayNameInput = stage.querySelector<HTMLInputElement>("[data-join-display-name]");
  const joinButton = stage.querySelector<HTMLButtonElement>("[data-join-playtest-button]");
  const readyPanel = stage.querySelector<HTMLElement>("[data-player-ready-panel]");
  const readyHelper = stage.querySelector<HTMLElement>("[data-ready-helper]");
  const readyButton = stage.querySelector<HTMLButtonElement>("[data-ready-toggle]");
  const modeButtons = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-mode-choice]"));
  const matchLengthButtons = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-match-length-choice]"));
  const mapPickButtons = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-map-pick-choice]"));
  const mapPreview = stage.querySelector<HTMLElement>("[data-map-preview]");
  const mapRailScroller = stage.querySelector<HTMLElement>(".online-map-rail__scroller");
  const mapRailScrollButtons = Array.from(stage.querySelectorAll<HTMLButtonElement>("[data-map-rail-scroll]"));
  const selectedMapName = stage.querySelector<HTMLElement>("[data-selected-map-name]");
  const selectedMapSummary = stage.querySelector<HTMLElement>("[data-selected-map-summary]");
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
  const optimisticCharacterSelections = new Map<string, string>();
  let activePickerSlotId = "";
  let latestSnapshot: RoomSnapshot | undefined;
  let latestLocalSessionId = "";
  let latestLocalDisplayName = joinDisplayNameValue(joinDisplayNameInput?.value ?? "");
  let latestLocalReady = false;

  if (joinDisplayNameInput) {
    joinDisplayNameInput.value = latestLocalDisplayName;
    joinDisplayNameInput.addEventListener("keydown", handleJoinDisplayNameKeydown);
  }
  joinButton?.addEventListener("click", submitJoinPlaytest);
  reconnectButton?.addEventListener("click", () => handlers.reconnect());
  readyButton?.addEventListener("click", () => handlers.readyClicked());

  wireChoiceButtons(modeButtons, (button) => button.dataset.modeChoice ?? "2v2", handlers.modeChanged);
  wireChoiceButtons(
    matchLengthButtons,
    (button) => button.dataset.matchLengthChoice ?? "best-of-1",
    handlers.matchLengthChanged,
  );
  wireChoiceButtons(mapPickButtons, (button) => button.dataset.mapPickChoice ?? "random", handlers.mapPickChanged);
  wireMapRailScrollButtons(mapRailScrollButtons, mapRailScroller);

  stage.addEventListener("click", handleStageClick);

  return {
    stage,
    displayName: () => joinDisplayNameValue(joinDisplayNameInput?.value ?? latestLocalDisplayName),
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
    latestLocalReady = localReady;
    latestLocalDisplayName = playerName(playerBySessionId(snapshot.players, localSessionId)) || latestLocalDisplayName;
    if (joinDisplayNameInput) {
      joinDisplayNameInput.value = latestLocalDisplayName;
    }
    const visibleSnapshot = lobbySnapshotWithOptimisticCharacters(
      snapshot,
      localSessionId,
      optimisticCharacterSelections,
    );
    const model = lobbyRenderModel(visibleSnapshot, localSessionId, localReady);

    removeJoinBlock(joinBlock);
    showRoomBlock(roomBlock);
    setElementText(roomCodeLabel, roomDisplayLabel(visibleSnapshot.roomCode, fallbackRoomId));
    setElementText(hostLabel, lobbyHostLabel(visibleSnapshot.players, visibleSnapshot.hostSessionId, localSessionId));
    setElementText(roomStatus, model.statusText);
    renderReadyControl(readyPanel, readyButton, readyHelper, model);
    renderModeButtons(modeButtons, visibleSnapshot.mode, model);
    renderMatchLengthButtons(matchLengthButtons, visibleSnapshot.matchLength, model);
    renderMapButtons(mapPickButtons, visibleSnapshot.mapPick, model);
    renderMapPreview(visibleSnapshot.mapPick);
    setElementHtml(playerList, renderPlayerRows(visibleSnapshot.players, localSessionId, visibleSnapshot.slots));
    setElementHtml(
      slotList,
      renderSlotRows(visibleSnapshot.slots, localSessionId, visibleSnapshot.phase, visibleSnapshot.hostSessionId),
    );
    syncOpenPicker(visibleSnapshot);
  }

  function renderMapPreview(mapPick: string): void {
    setElementText(selectedMapName, mapPickLabel(mapPick));
    setElementText(selectedMapSummary, mapPickSummaryLabel(mapPick));
    if (mapPreview) {
      mapPreview.dataset.mapPick = mapPick;
    }
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

    const slotId = activePickerSlotId;
    optimisticCharacterSelections.set(slotId, characterId);
    handlers.characterSelected(slotId, characterId);
    closePicker();
    renderLatestLobbySnapshot();
  }

  function renderLatestLobbySnapshot(): void {
    if (latestSnapshot && latestLocalSessionId) {
      renderLobby(latestSnapshot, latestLocalSessionId, latestLocalReady);
    }
  }

  function claimSeat(slotId: string): void {
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
    applySeatActionIntent(slotId, lobbySeatActionIntent(action));
  }

  function applySeatActionIntent(slotId: string, intent: SeatActionIntent): void {
    if (intent === "claim-seat") {
      claimSeat(slotId);
      return;
    }

    if (intent === "open-picker") {
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

  function handleJoinDisplayNameKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    submitJoinPlaytest();
  }

  function submitJoinPlaytest(): void {
    latestLocalDisplayName = joinDisplayNameValue(joinDisplayNameInput?.value ?? latestLocalDisplayName);
    if (joinDisplayNameInput) {
      joinDisplayNameInput.value = latestLocalDisplayName;
    }
    handlers.joinPlaytest(latestLocalDisplayName);
  }
}

function lobbySnapshotWithOptimisticCharacters(
  snapshot: RoomSnapshot,
  localSessionId: string,
  optimisticSelections: Map<string, string>,
): RoomSnapshot {
  return {
    ...snapshot,
    slots: lobbySlotsWithOptimisticCharacters(snapshot.slots, localSessionId, optimisticSelections),
  };
}

export function lobbySlotsWithOptimisticCharacters(
  slots: readonly LobbySlotView[],
  localSessionId: string,
  optimisticSelections: Map<string, string>,
): LobbySlotView[] {
  return slots.map((slot) => lobbySlotWithOptimisticCharacter(slot, localSessionId, optimisticSelections));
}

function lobbySlotWithOptimisticCharacter(
  slot: LobbySlotView,
  localSessionId: string,
  optimisticSelections: Map<string, string>,
): LobbySlotView {
  const optimisticCharacterId = optimisticSelections.get(slot.slotId);
  if (!optimisticCharacterId) {
    return slot;
  }

  if (!canApplyOptimisticSelection(slot, localSessionId)) {
    optimisticSelections.delete(slot.slotId);
    return slot;
  }

  if (slot.characterSelected) {
    optimisticSelections.delete(slot.slotId);
    return slot;
  }

  return {
    ...slot,
    characterId: optimisticCharacterId,
    characterSelected: true,
    ready: false,
  };
}

function canApplyOptimisticSelection(slot: LobbySlotView, localSessionId: string): boolean {
  return slot.active && slot.ownerSessionId === localSessionId;
}

export function joinDisplayNameValue(value: string, random: () => number = Math.random): string {
  const trimmed = value.trim();
  return trimmed || `Guest ${100 + Math.floor(random() * 900)}`;
}

function wireChoiceButtons(
  buttons: readonly HTMLButtonElement[],
  valueForButton: (button: HTMLButtonElement) => string,
  onChosen: (value: string) => void,
): void {
  for (const button of buttons) {
    button.addEventListener("click", () => onChosen(valueForButton(button)));
  }
}

function wireMapRailScrollButtons(
  buttons: readonly HTMLButtonElement[],
  scroller: HTMLElement | null,
): void {
  for (const button of buttons) {
    button.addEventListener("click", () => scrollMapRail(scroller, button.dataset.mapRailScroll ?? "right"));
  }
}

function scrollMapRail(scroller: HTMLElement | null, direction: string): void {
  if (!scroller) {
    return;
  }

  scroller.scrollBy({
    left: direction === "left" ? -184 : 184,
    behavior: "smooth",
  });
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

export function lobbyRenderModel(
  snapshot: RoomSnapshot,
  localSessionId: string,
  localReady: boolean,
): LobbyRenderModel {
  const localPlayer = playerBySessionId(snapshot.players, localSessionId);
  const ownedActiveSlot = snapshot.slots.find((slot) => slot.active && slot.ownerSessionId === localSessionId);
  return {
    isHost: snapshot.hostSessionId === localSessionId,
    canChangeMode: canLocalPlayerChangeMode(snapshot.hostSessionId === localSessionId, snapshot.phase),
    canChangeRoomSettings: canLocalPlayerChangeRoomSettings(
      snapshot.hostSessionId === localSessionId,
      snapshot.phase,
    ),
    canUseLobbyControls: canLocalPlayerUseLobbyControls(Boolean(ownedActiveSlot), snapshot.phase),
    canReady: canLocalPlayerUseLobbyControls(Boolean(ownedActiveSlot && slotHasReadyableUnit(ownedActiveSlot)), snapshot.phase),
    effectiveReady: playerReady(localPlayer, localReady),
    statusText: roomStatusText(snapshot),
  };
}

function slotHasReadyableUnit(slot: LobbySlotView): boolean {
  return slot.characterSelected || slot.ready;
}

export function readyControlPresentation(model: LobbyRenderModel): ReadyControlPresentation {
  const hasActiveSeat = model.canUseLobbyControls;
  return {
    buttonDisabled: !model.canReady,
    buttonHidden: !hasActiveSeat,
    buttonText: model.effectiveReady ? "Unready" : "Ready",
    helperText: readyControlHelperText(model),
    panelHidden: !hasActiveSeat,
  };
}

function readyControlHelperText(model: LobbyRenderModel): string {
  if (!model.canUseLobbyControls) {
    return "Claim a seat to ready.";
  }

  return model.canReady ? "Ready when your unit is set." : "Choose a unit before readying.";
}

function roomStatusText(snapshot: RoomSnapshot): string {
  const host = playerBySessionId(snapshot.players, snapshot.hostSessionId);
  const openSeatCount = snapshot.slots.filter((slot) => slot.active && !slot.ownerSessionId).length;
  const nextUnreadySlot = snapshot.slots.find(
    (slot) => slot.active && slot.ownerSessionId && !playerBySessionId(snapshot.players, slot.ownerSessionId)?.ready,
  );
  const nextReadyPlayer = playerBySessionId(snapshot.players, nextUnreadySlot?.ownerSessionId ?? "");
  const settingsLabel = [
    modeLabel(snapshot.mode),
    modeSubLabel(snapshot.mode),
    matchLengthLabel(snapshot.matchLength),
    mapPickLabel(snapshot.mapPick),
  ].join(" - ");
  return `${settingsLabel} - ${lobbyStatusText({
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

function removeJoinBlock(joinBlock: HTMLElement | null): void {
  if (joinBlock) {
    joinBlock.remove();
  }
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

function renderReadyControl(
  panel: HTMLElement | null,
  button: HTMLButtonElement | null,
  helper: HTMLElement | null,
  model: LobbyRenderModel,
): void {
  const presentation = readyControlPresentation(model);
  if (panel) {
    panel.hidden = presentation.panelHidden;
  }
  setElementText(helper, presentation.helperText);
  if (button) {
    button.hidden = presentation.buttonHidden;
    button.textContent = presentation.buttonText;
    button.disabled = presentation.buttonDisabled;
  }
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

function renderMatchLengthButtons(
  buttons: readonly HTMLButtonElement[],
  matchLength: string,
  model: LobbyRenderModel,
): void {
  for (const button of buttons) {
    const selected = button.dataset.matchLengthChoice === matchLength;
    button.disabled = !model.canChangeRoomSettings;
    button.dataset.selected = selected ? "true" : "false";
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.title = roomSettingsTitle(model, "Match length");
  }
}

function renderMapButtons(
  buttons: readonly HTMLButtonElement[],
  mapPick: string,
  model: LobbyRenderModel,
): void {
  for (const button of buttons) {
    const selected = button.dataset.mapPickChoice === mapPick;
    button.disabled = !model.canChangeRoomSettings;
    button.dataset.selected = selected ? "true" : "false";
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.title = roomSettingsTitle(model, "Map");
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

function roomSettingsTitle(model: LobbyRenderModel, label: string): string {
  if (model.canChangeRoomSettings) {
    return `Choose the playtest ${label.toLowerCase()}.`;
  }

  if (!model.isHost) {
    return `Only the lobby host can change ${label.toLowerCase()}.`;
  }

  return `${label} is locked after gameplay starts.`;
}
