import { escapeHtml, renderLobbyShell, renderPlayerRows, renderSlotRows } from "./onlineLobbyMarkup";
import type { RoomSnapshot } from "./onlineLobbySnapshot";
import { canLocalPlayerUseLobbyControls, lobbyStatusText, modeLabel } from "./onlineLobbyView";

export type OnlineLobbyDomHandlers = {
  reconnect: () => void;
  displayNameChanged: (value: string) => void;
  modeChanged: (mode: string) => void;
  slotChanged: (slotId: string, characterId: string) => void;
  readyClicked: () => void;
  capsuleClicked: () => void;
  nameplateChanged: (nameplate: string) => void;
};

export type BadgeTone = "neutral" | "ok" | "warn" | "error";

export type OnlineLobbyDom = {
  stage: HTMLElement;
  displayName: () => string;
  setBadge: (text: string, tone: BadgeTone) => void;
  renderLobby: (snapshot: RoomSnapshot, localSessionId: string, localReady: boolean, fallbackRoomId?: string) => void;
  remove: () => void;
};

export function createOnlineLobbyDom(documentRef: Document, handlers: OnlineLobbyDomHandlers): OnlineLobbyDom {
  const stage = createOnlineLobbyStage(documentRef);
  const displayNameInput = stage.querySelector<HTMLInputElement>("#display-name");
  const reconnectButton = stage.querySelector<HTMLButtonElement>("[data-auto-connect]");
  const readyButton = stage.querySelector<HTMLButtonElement>("[data-ready-toggle]");
  const capsuleButton = stage.querySelector<HTMLButtonElement>("[data-test-capsule]");
  const nameplateSelect = stage.querySelector<HTMLSelectElement>("[data-nameplate-select]");
  const modeSelect = stage.querySelector<HTMLSelectElement>("[data-mode-select]");
  const roomBlock = stage.querySelector<HTMLElement>("[data-room-block]");
  const roomCodeLabel = stage.querySelector<HTMLElement>("[data-room-code]");
  const statusBadge = stage.querySelector<HTMLElement>("[data-status-badge]");
  const roomStatus = stage.querySelector<HTMLElement>("[data-room-status]");
  const playerList = stage.querySelector<HTMLElement>("[data-player-list]");
  const slotList = stage.querySelector<HTMLElement>("[data-slot-list]");
  const rewardLog = stage.querySelector<HTMLElement>("[data-reward-log]");

  reconnectButton?.addEventListener("click", () => handlers.reconnect());
  displayNameInput?.addEventListener("change", () => handlers.displayNameChanged(displayNameInput.value));
  modeSelect?.addEventListener("change", () => handlers.modeChanged(modeSelect.value));
  readyButton?.addEventListener("click", () => handlers.readyClicked());
  capsuleButton?.addEventListener("click", () => handlers.capsuleClicked());
  nameplateSelect?.addEventListener("change", () => handlers.nameplateChanged(nameplateSelect.value));

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
  }

  function renderLobby(
    snapshot: RoomSnapshot,
    localSessionId: string,
    localReady: boolean,
    fallbackRoomId = "",
  ): void {
    if (roomBlock) {
      roomBlock.hidden = false;
    }

    if (roomCodeLabel) {
      roomCodeLabel.textContent = snapshot.roomCode || fallbackRoomId;
    }

    if (rewardLog) {
      rewardLog.textContent = snapshot.lastRewardLog;
    }

    const localPlayer = snapshot.players.find((player) => player.sessionId === localSessionId);
    const redCaptain = snapshot.players.find((player) => player.sessionId === snapshot.redCaptainSessionId);
    const blueCaptain = snapshot.players.find((player) => player.sessionId === snapshot.blueCaptainSessionId);
    const localRole = localPlayer?.role ?? "spectator";
    const canUseLobbyControls = canLocalPlayerUseLobbyControls(localRole, snapshot.phase);
    const effectiveReady = localPlayer?.ready ?? localReady;

    if (roomStatus) {
      roomStatus.textContent = `${modeLabel(snapshot.mode)} - ${lobbyStatusText({
        status: snapshot.status,
        redCaptainName: redCaptain?.displayName ?? "",
        blueCaptainName: blueCaptain?.displayName ?? "",
        redReady: Boolean(redCaptain?.ready),
        blueReady: Boolean(blueCaptain?.ready),
      })}`;
    }

    if (readyButton) {
      readyButton.textContent = effectiveReady ? "Unready" : "Ready";
      readyButton.disabled = !canUseLobbyControls;
    }

    if (modeSelect) {
      modeSelect.value = snapshot.mode === "1v1" ? "1v1" : "2v2";
      modeSelect.disabled = localRole !== "red-captain" || !canUseLobbyControls;
    }

    if (localPlayer && nameplateSelect) {
      const currentValue = nameplateSelect.value || localPlayer.equippedNameplate;
      nameplateSelect.innerHTML = localPlayer.inventory
        .map((nameplate) => `<option value="${escapeHtml(nameplate)}">${escapeHtml(nameplate)}</option>`)
        .join("");
      nameplateSelect.value = localPlayer.inventory.includes(currentValue)
        ? currentValue
        : localPlayer.equippedNameplate;
    }

    if (playerList) {
      playerList.innerHTML = renderPlayerRows(snapshot.players, localSessionId);
    }

    if (slotList) {
      slotList.innerHTML = renderSlotRows(snapshot.slots, localRole, canUseLobbyControls);
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
