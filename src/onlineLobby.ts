import { resolveOnlineServerUrl } from "./onlineServerUrl";
import {
  canLocalPlayerUseLobbyControls,
  lobbyStatusText,
  modeLabel,
  stageForRoomPhase,
} from "./onlineLobbyView";
import { escapeHtml, renderLobbyShell, renderPlayerRows, renderSlotRows } from "./onlineLobbyMarkup";
import { getRoomSnapshot, type RoomSnapshot } from "./onlineLobbySnapshot";

type OnlineRoom = {
  roomId: string;
  sessionId: string;
  state: unknown;
  send: (type: string, message?: unknown) => void;
  leave: () => Promise<unknown> | unknown;
  onStateChange: (callback: (state: unknown) => void) => void;
  onLeave: (callback: () => void) => void;
};

type OnlineClient = {
  joinOrCreate: (roomName: string, options?: Record<string, unknown>) => Promise<OnlineRoom>;
};

type OnlineLobbyOptions = {
  onGameplayStart?: () => void;
};

declare global {
  interface Window {
    Colyseus?: {
      Client: new (endpoint: string) => OnlineClient;
    };
  }
}

const serverUrl =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_COLYSEUS_URL) ??
  resolveOnlineServerUrl(window.location);

export function mountOnlineLobby(options: OnlineLobbyOptions = {}) {
  const stage = createOnlineLobbyStage();
  document.body.appendChild(stage);

  const client = createOnlineClient();
  let room: OnlineRoom | undefined;
  let latestSnapshot: RoomSnapshot | undefined;
  let localReady = false;
  let gameplayStarted = false;

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

  reconnectButton?.addEventListener("click", () => {
    void connectAutoRoom();
  });

  displayNameInput?.addEventListener("change", () => {
    room?.send("setDisplayName", displayNameInput.value);
  });

  modeSelect?.addEventListener("change", () => {
    room?.send("setMode", { mode: modeSelect.value });
  });

  stage.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || !target.dataset.slotSelect) {
      return;
    }

    room?.send("selectCharacter", {
      slotId: target.dataset.slotId,
      characterId: target.value,
    });
  });

  readyButton?.addEventListener("click", () => {
    localReady = !localReady;
    room?.send("setReady", { ready: localReady });
    render(latestSnapshot);
  });

  capsuleButton?.addEventListener("click", () => {
    room?.send("claimTestCapsule");
  });

  nameplateSelect?.addEventListener("change", () => {
    room?.send("equipNameplate", { nameplate: nameplateSelect.value });
  });

  void connectAutoRoom();

  function connectAutoRoom() {
    return connect(() => client.joinOrCreate("gravity_canyon", { displayName: displayNameInput?.value }));
  }

  async function connect(join: () => Promise<OnlineRoom>) {
    try {
      setBadge("Connecting", "warn");
      room?.leave();
      room = await join();
      localReady = false;
      setBadge("Online", "ok");

      room.onStateChange((state) => {
        latestSnapshot = getRoomSnapshot(state);
        render(latestSnapshot);
      });

      room.onLeave(() => {
        setBadge("Offline", "neutral");
      });
    } catch (error) {
      setBadge("Server off", "error");
      console.error(error);
    }
  }

  function render(snapshot?: RoomSnapshot) {
    if (!snapshot || gameplayStarted) {
      return;
    }

    if (stageForRoomPhase(snapshot.phase) === "gameplay") {
      startGameplay();
      return;
    }

    roomBlock!.hidden = false;
    roomCodeLabel!.textContent = snapshot.roomCode || room?.roomId || "";
    rewardLog!.textContent = snapshot.lastRewardLog;

    const localPlayer = snapshot.players.find((player) => player.sessionId === room?.sessionId);
    const redCaptain = snapshot.players.find((player) => player.sessionId === snapshot.redCaptainSessionId);
    const blueCaptain = snapshot.players.find((player) => player.sessionId === snapshot.blueCaptainSessionId);
    const localRole = localPlayer?.role ?? "spectator";
    const canUseLobbyControls = canLocalPlayerUseLobbyControls(localRole, snapshot.phase);
    if (localPlayer) {
      localReady = localPlayer.ready;
    }

    roomStatus!.textContent = `${modeLabel(snapshot.mode)} - ${lobbyStatusText({
      status: snapshot.status,
      redCaptainName: redCaptain?.displayName ?? "",
      blueCaptainName: blueCaptain?.displayName ?? "",
      redReady: Boolean(redCaptain?.ready),
      blueReady: Boolean(blueCaptain?.ready),
    })}`;

    readyButton!.textContent = localReady ? "Unready" : "Ready";
    readyButton!.disabled = !canUseLobbyControls;
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
      playerList.innerHTML = renderPlayerRows(snapshot.players, room?.sessionId ?? "");
    }

    if (slotList) {
      slotList.innerHTML = renderSlotRows(snapshot.slots, localRole, canUseLobbyControls);
    }
  }

  function setBadge(text: string, tone: "neutral" | "ok" | "warn" | "error") {
    if (!statusBadge) {
      return;
    }

    statusBadge.textContent = text;
    statusBadge.dataset.tone = tone;
  }

  function startGameplay() {
    if (gameplayStarted) {
      return;
    }

    gameplayStarted = true;
    stage.remove();
    options.onGameplayStart?.();
  }
}

function createOnlineClient() {
  if (!window.Colyseus?.Client) {
    throw new Error("Colyseus browser SDK did not load.");
  }

  return new window.Colyseus.Client(serverUrl);
}

function createOnlineLobbyStage(): HTMLElement {
  const template = document.createElement("template");
  template.innerHTML = renderLobbyShell().trim();
  const stage = template.content.firstElementChild;
  if (!(stage instanceof HTMLElement)) {
    throw new Error("Online lobby shell did not render.");
  }

  return stage;
}
