import { renderLobbyShell, renderPlayerRows, renderSlotRows } from "./onlineLobbyMarkup";
import type { PlayerSnapshot, RoomSnapshot } from "./onlineLobbySnapshot";
import { canLocalPlayerUseLobbyControls, lobbyStatusText, modeLabel } from "./onlineLobbyView";

export type OnlineLobbyDomHandlers = {
  reconnect: () => void;
  displayNameChanged: (value: string) => void;
  modeChanged: (mode: string) => void;
  slotChanged: (slotId: string, characterId: string) => void;
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
  canUseLobbyControls: boolean;
  effectiveReady: boolean;
  statusText: string;
};

export function createOnlineLobbyDom(documentRef: Document, handlers: OnlineLobbyDomHandlers): OnlineLobbyDom {
  const stage = createOnlineLobbyStage(documentRef);
  const displayNameInput = stage.querySelector<HTMLInputElement>("#display-name");
  const reconnectButton = stage.querySelector<HTMLButtonElement>("[data-auto-connect]");
  const readyButton = stage.querySelector<HTMLButtonElement>("[data-ready-toggle]");
  const modeSelect = stage.querySelector<HTMLSelectElement>("[data-mode-select]");
  const roomBlock = stage.querySelector<HTMLElement>("[data-room-block]");
  const roomCodeLabel = stage.querySelector<HTMLElement>("[data-room-code]");
  const statusBadge = stage.querySelector<HTMLElement>("[data-status-badge]");
  const roomStatus = stage.querySelector<HTMLElement>("[data-room-status]");
  const playerList = stage.querySelector<HTMLElement>("[data-player-list]");
  const slotList = stage.querySelector<HTMLElement>("[data-slot-list]");

  reconnectButton?.addEventListener("click", () => handlers.reconnect());
  displayNameInput?.addEventListener("change", () => handlers.displayNameChanged(displayNameInput.value));
  modeSelect?.addEventListener("change", () => handlers.modeChanged(modeSelect.value));
  readyButton?.addEventListener("click", () => handlers.readyClicked());

  stage.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.dataset.slotSelect) {
      return;
    }

    handlers.slotChanged(target.dataset.slotId ?? "", target.value);
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
    const model = lobbyRenderModel(snapshot, localSessionId, localReady);

    showRoomBlock(roomBlock);
    setElementText(roomCodeLabel, snapshot.roomCode || fallbackRoomId);
    setElementText(roomStatus, model.statusText);
    renderReadyButton(readyButton, model);
    renderModeSelect(modeSelect, snapshot.mode, model);
    setElementHtml(playerList, renderPlayerRows(snapshot.players, localSessionId));
    setElementHtml(slotList, renderSlotRows(snapshot.slots, model.localRole, model.canUseLobbyControls));
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
  return {
    localRole,
    canUseLobbyControls: canLocalPlayerUseLobbyControls(localRole, snapshot.phase),
    effectiveReady: playerReady(localPlayer, localReady),
    statusText: roomStatusText(snapshot),
  };
}

function roomStatusText(snapshot: RoomSnapshot): string {
  const redCaptain = playerBySessionId(snapshot.players, snapshot.redCaptainSessionId);
  const blueCaptain = playerBySessionId(snapshot.players, snapshot.blueCaptainSessionId);
  return `${modeLabel(snapshot.mode)} - ${lobbyStatusText({
    status: snapshot.status,
    redCaptainName: playerName(redCaptain),
    blueCaptainName: playerName(blueCaptain),
    redReady: playerReady(redCaptain, false),
    blueReady: playerReady(blueCaptain, false),
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

function renderModeSelect(select: HTMLSelectElement | null, mode: string, model: LobbyRenderModel): void {
  if (!select) {
    return;
  }

  select.value = mode === "1v1" ? "1v1" : "2v2";
  select.disabled = model.localRole !== "red-captain" || !model.canUseLobbyControls;
}
