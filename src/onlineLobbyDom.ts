import {
  renderCharacterPickerOptions,
  renderLobbyShell,
  renderPlayerRows,
  renderSlotRows,
} from "./onlineLobbyMarkup";
import type { PlayerSnapshot, RoomSnapshot } from "./onlineLobbySnapshot";
import {
  canLocalPlayerUseLobbyControls,
  lobbyStatusText,
  modeLabel,
  modeSubLabel,
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
  localRole: string;
  isHost: boolean;
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

  stage.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const seatButton = target.closest<HTMLElement>("[data-seat-action]");
    if (seatButton) {
      handleSeatAction(seatButton);
      return;
    }

    const characterButton = target.closest<HTMLElement>("[data-character-choice]");
    if (characterButton) {
      const characterId = characterButton.dataset.characterChoice ?? "";
      if (activePickerSlotId && characterId) {
        handlers.characterSelected(activePickerSlotId, characterId);
        closePicker();
      }
      return;
    }

    if (target.closest("[data-character-picker-close]")) {
      closePicker();
    }
  });

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
    setElementText(roomCodeLabel, snapshot.roomCode || fallbackRoomId);
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

    if (button.dataset.seatAction === "claim") {
      activePickerSlotId = slotId;
      handlers.seatClaimed(slotId);
      return;
    }

    if (button.dataset.seatAction === "pick") {
      openPicker(slotId);
    }
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
    if (!snapshot || !activePickerSlotId || !pickerOptions) {
      return;
    }

    const slot = snapshot.slots.find((candidate) => candidate.slotId === activePickerSlotId);
    if (!slot || slot.ownerSessionId !== latestLocalSessionId) {
      closePicker();
      return;
    }

    setElementText(pickerSlot, slot.slotId);
    setElementHtml(pickerOptions, renderCharacterPickerOptions(slot.characterId));
    if (picker) {
      picker.hidden = false;
    }
  }
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
  const localRole = playerRole(localPlayer);
  const hasOwnedActiveSeat = snapshot.slots.some((slot) => slot.active && slot.ownerSessionId === localSessionId);
  return {
    localRole,
    isHost: snapshot.hostSessionId === localSessionId,
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

function playerRole(player: PlayerSnapshot | undefined): string {
  return player ? player.role : "spectator";
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
    button.disabled = !model.isHost || model.localRole === "spectator";
    button.dataset.selected = selected ? "true" : "false";
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  }
}
