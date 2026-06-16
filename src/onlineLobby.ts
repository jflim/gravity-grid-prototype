import { resolveOnlineServerUrl } from "./onlineServerUrl";
import {
  canLocalPlayerEditSlot,
  canLocalPlayerUseLobbyControls,
  lobbyStatusText,
  localRoleLabel,
  modeLabel,
  stageForRoomPhase,
  slotLabel,
} from "./onlineLobbyView";
import { getRoomSnapshot, type RoomSnapshot } from "./onlineLobbySnapshot";

const CHARACTER_OPTIONS = ["nova", "vesper", "kaelii", "perlah"] as const;
const SLOT_ORDER = ["red-1", "blue-1", "red-2", "blue-2"];

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
  const stage = document.createElement("section");
  stage.className = "online-stage";
  stage.innerHTML = `
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
  `;

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

    renderPlayers(snapshot, room?.sessionId ?? "");
    renderSlots(snapshot, localRole, canUseLobbyControls);
  }

  function renderPlayers(snapshot: RoomSnapshot, localSessionId: string) {
    if (!playerList) {
      return;
    }

    playerList.innerHTML = snapshot.players
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

  function renderSlots(snapshot: RoomSnapshot, localRole: string, canUseLobbyControls: boolean) {
    if (!slotList) {
      return;
    }

    slotList.innerHTML = snapshot.slots
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

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function slotSortValue(slotId: string) {
  const index = SLOT_ORDER.indexOf(slotId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
