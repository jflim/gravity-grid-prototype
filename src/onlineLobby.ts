import { resolveOnlineServerUrl } from "./onlineServerUrl";
import {
  canLocalPlayerEditSlot,
  canLocalPlayerUseLobbyControls,
  lobbyStatusText,
  localRoleLabel,
  modeLabel,
  normalizeLobbySlots,
  slotLabel,
  type LobbySlotView,
} from "./onlineLobbyView";

const CHARACTER_OPTIONS = ["nova", "vesper", "kaelii", "perlah"] as const;
const SLOT_ORDER = ["red-1", "blue-1", "red-2", "blue-2"];

type PlayerSnapshot = {
  sessionId: string;
  displayName: string;
  team: string;
  role: string;
  joinOrder: number;
  ready: boolean;
  tokens: number;
  equippedNameplate: string;
  inventory: string[];
};

type CombatVehicleSnapshot = {
  vehicleId: string;
  ownerSessionId: string;
  displayName: string;
  team: string;
  className: string;
  hp: number;
  maxHp: number;
  alive: boolean;
  x: number;
  y: number;
  angle: number;
};

type RoomSnapshot = {
  roomCode: string;
  mode: string;
  redCaptainSessionId: string;
  blueCaptainSessionId: string;
  spectatorSessionIds: string[];
  phase: string;
  status: string;
  roundNumber: number;
  turnNumber: number;
  wind: number;
  activeVehicleId: string;
  winnerTeam: string;
  lastRewardLog: string;
  players: PlayerSnapshot[];
  slots: LobbySlotView[];
  vehicles: CombatVehicleSnapshot[];
};

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

export function mountOnlineLobby() {
  const panel = document.createElement("aside");
  panel.className = "online-panel";
  panel.innerHTML = `
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
      <div class="online-combat" data-combat-block hidden>
        <div class="online-combat__meta" data-combat-meta></div>
        <div class="online-combat__vehicles" data-vehicle-list></div>
        <div class="online-panel__actions">
          <button type="button" data-preview-fire>Server Shot</button>
          <button type="button" data-next-round>Next Round</button>
        </div>
      </div>
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
  `;

  document.body.appendChild(panel);

  const client = createOnlineClient();
  let room: OnlineRoom | undefined;
  let latestSnapshot: RoomSnapshot | undefined;
  let localReady = false;

  const displayNameInput = panel.querySelector<HTMLInputElement>("#display-name");
  const reconnectButton = panel.querySelector<HTMLButtonElement>("[data-auto-connect]");
  const readyButton = panel.querySelector<HTMLButtonElement>("[data-ready-toggle]");
  const capsuleButton = panel.querySelector<HTMLButtonElement>("[data-test-capsule]");
  const previewFireButton = panel.querySelector<HTMLButtonElement>("[data-preview-fire]");
  const nextRoundButton = panel.querySelector<HTMLButtonElement>("[data-next-round]");
  const nameplateSelect = panel.querySelector<HTMLSelectElement>("[data-nameplate-select]");
  const modeSelect = panel.querySelector<HTMLSelectElement>("[data-mode-select]");
  const roomBlock = panel.querySelector<HTMLElement>("[data-room-block]");
  const roomCodeLabel = panel.querySelector<HTMLElement>("[data-room-code]");
  const statusBadge = panel.querySelector<HTMLElement>("[data-status-badge]");
  const roomStatus = panel.querySelector<HTMLElement>("[data-room-status]");
  const playerList = panel.querySelector<HTMLElement>("[data-player-list]");
  const slotList = panel.querySelector<HTMLElement>("[data-slot-list]");
  const combatBlock = panel.querySelector<HTMLElement>("[data-combat-block]");
  const combatMeta = panel.querySelector<HTMLElement>("[data-combat-meta]");
  const vehicleList = panel.querySelector<HTMLElement>("[data-vehicle-list]");
  const rewardLog = panel.querySelector<HTMLElement>("[data-reward-log]");

  reconnectButton?.addEventListener("click", () => {
    void connectAutoRoom();
  });

  displayNameInput?.addEventListener("change", () => {
    room?.send("setDisplayName", displayNameInput.value);
  });

  modeSelect?.addEventListener("change", () => {
    room?.send("setMode", { mode: modeSelect.value });
  });

  panel.addEventListener("change", (event) => {
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

  previewFireButton?.addEventListener("click", () => {
    room?.send("previewFire");
  });

  nextRoundButton?.addEventListener("click", () => {
    room?.send("startNextRound");
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
        latestSnapshot = getSnapshot(state);
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
    if (!snapshot) {
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
    renderCombat(snapshot);
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

  function renderCombat(snapshot: RoomSnapshot) {
    if (!combatBlock || !combatMeta || !vehicleList || !previewFireButton || !nextRoundButton) {
      return;
    }

    const hasCombat = snapshot.vehicles.length > 0;
    combatBlock.hidden = !hasCombat;
    if (!hasCombat) {
      return;
    }

    const activeVehicle = snapshot.vehicles.find((vehicle) => vehicle.vehicleId === snapshot.activeVehicleId);
    const localActive = activeVehicle?.ownerSessionId === room?.sessionId;
    const windLabel = snapshot.wind > 0 ? `+${snapshot.wind}` : String(snapshot.wind);
    const winnerLabel = snapshot.winnerTeam ? `${capitalize(snapshot.winnerTeam)} team won` : "In progress";

    combatMeta.innerHTML = `
      <span>Round ${snapshot.roundNumber}</span>
      <span>Turn ${snapshot.turnNumber || "-"}</span>
      <span>Wind ${escapeHtml(windLabel)}</span>
      <strong>${escapeHtml(activeVehicle?.displayName ?? winnerLabel)}</strong>
    `;

    vehicleList.innerHTML = snapshot.vehicles
      .map((vehicle) => {
        const hpRatio = vehicle.maxHp > 0 ? vehicle.hp / vehicle.maxHp : 0;
        const active = vehicle.vehicleId === snapshot.activeVehicleId ? " online-vehicle--active" : "";
        const ko = vehicle.alive ? "" : " online-vehicle--ko";
        return `
          <div class="online-vehicle online-vehicle--${vehicle.team}${active}${ko}">
            <div>
              <strong>${escapeHtml(vehicle.displayName)}</strong>
              <span>${escapeHtml(vehicle.className)}</span>
            </div>
            <div class="online-vehicle__hp" aria-label="${vehicle.hp} HP">
              <i style="width: ${Math.max(0, Math.min(100, hpRatio * 100))}%"></i>
            </div>
            <em>${vehicle.alive ? `${vehicle.hp} HP` : "KO"}</em>
          </div>
        `;
      })
      .join("");

    previewFireButton.disabled = snapshot.phase !== "combat-preview" || !localActive;
    previewFireButton.textContent = localActive ? "Server Shot" : "Waiting";
    nextRoundButton.disabled = snapshot.phase !== "round-over";
  }

  function setBadge(text: string, tone: "neutral" | "ok" | "warn" | "error") {
    if (!statusBadge) {
      return;
    }

    statusBadge.textContent = text;
    statusBadge.dataset.tone = tone;
  }
}

function createOnlineClient() {
  if (!window.Colyseus?.Client) {
    throw new Error("Colyseus browser SDK did not load.");
  }

  return new window.Colyseus.Client(serverUrl);
}

function getSnapshot(state: unknown): RoomSnapshot {
  const source = state as {
    roomCode?: string;
    mode?: string;
    redCaptainSessionId?: string;
    blueCaptainSessionId?: string;
    spectatorSessionIds?: string[] | Iterable<string>;
    phase?: string;
    status?: string;
    lastRewardLog?: string;
    roundNumber?: number;
    turnNumber?: number;
    wind?: number;
    activeVehicleId?: string;
    winnerTeam?: string;
    players?: Map<string, unknown> | Record<string, unknown>;
    slots?: Map<string, unknown> | Record<string, unknown> | unknown[] | Iterable<unknown>;
    vehicles?: unknown[] | Iterable<unknown>;
  };
  const players = getPlayers(source.players);

  return {
    roomCode: source.roomCode ?? "",
    mode: source.mode ?? "2v2",
    redCaptainSessionId: source.redCaptainSessionId ?? "",
    blueCaptainSessionId: source.blueCaptainSessionId ?? "",
    spectatorSessionIds: Array.from(source.spectatorSessionIds ?? []),
    phase: source.phase ?? "lobby",
    status: source.status ?? "",
    roundNumber: source.roundNumber ?? 1,
    turnNumber: source.turnNumber ?? 0,
    wind: source.wind ?? 0,
    activeVehicleId: source.activeVehicleId ?? "",
    winnerTeam: source.winnerTeam ?? "",
    lastRewardLog: source.lastRewardLog ?? "",
    players,
    slots: normalizeLobbySlots(source.slots, players),
    vehicles: getVehicles(source.vehicles),
  };
}

function getPlayers(players: Map<string, unknown> | Record<string, unknown> | undefined) {
  const snapshots: PlayerSnapshot[] = [];
  const readPlayer = (player: unknown, key: string) => {
    const source = player as {
      sessionId?: string;
      displayName?: string;
      team?: string;
      role?: string;
      joinOrder?: number;
      ready?: boolean;
      tokens?: number;
      equippedNameplate?: string;
      inventory?: string[] | Iterable<string>;
    };

    snapshots.push({
      sessionId: source.sessionId ?? key,
      displayName: source.displayName ?? "Guest",
      team: source.team ?? "red",
      role: source.role ?? "spectator",
      joinOrder: source.joinOrder ?? 0,
      ready: Boolean(source.ready),
      tokens: source.tokens ?? 0,
      equippedNameplate: source.equippedNameplate ?? "Canyon Rookie",
      inventory: Array.from(source.inventory ?? ["Canyon Rookie"]),
    });
  };

  if (players instanceof Map || typeof players?.forEach === "function") {
    const iterablePlayers = players as { forEach: (callback: (player: unknown, key: string) => void) => void };
    iterablePlayers.forEach(readPlayer);
  } else if (players) {
    Object.entries(players).forEach(([key, player]) => readPlayer(player, key));
  }

  return snapshots;
}

function getVehicles(vehicles: unknown[] | Iterable<unknown> | undefined) {
  const snapshots: CombatVehicleSnapshot[] = [];

  for (const vehicle of Array.from(vehicles ?? [])) {
    const source = vehicle as Partial<CombatVehicleSnapshot>;
    snapshots.push({
      vehicleId: source.vehicleId ?? "",
      ownerSessionId: source.ownerSessionId ?? "",
      displayName: source.displayName ?? "Guest",
      team: source.team ?? "red",
      className: source.className ?? "Rig",
      hp: source.hp ?? 0,
      maxHp: source.maxHp ?? 100,
      alive: source.alive ?? false,
      x: source.x ?? 0,
      y: source.y ?? 0,
      angle: source.angle ?? 0,
    });
  }

  return snapshots;
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
