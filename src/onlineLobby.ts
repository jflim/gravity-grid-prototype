import { resolveOnlineServerUrl } from "./onlineServerUrl";

type PlayerSnapshot = {
  sessionId: string;
  displayName: string;
  team: string;
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
  phase: string;
  status: string;
  roundNumber: number;
  turnNumber: number;
  wind: number;
  activeVehicleId: string;
  winnerTeam: string;
  lastRewardLog: string;
  players: PlayerSnapshot[];
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
  create: (roomName: string, options?: Record<string, unknown>) => Promise<OnlineRoom>;
  joinById: (roomId: string, options?: Record<string, unknown>) => Promise<OnlineRoom>;
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
      <button type="button" data-create-room>Create</button>
      <button type="button" data-join-room>Join</button>
    </div>
    <div class="online-panel__field">
      <label for="room-code">Room Code</label>
      <input id="room-code" autocomplete="off" />
    </div>
    <div class="online-panel__room" data-room-block hidden>
      <div class="online-panel__room-code">
        <span>Room</span>
        <strong data-room-code></strong>
      </div>
      <p class="online-panel__status" data-room-status></p>
      <div class="online-panel__players" data-player-list></div>
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
  const roomCodeInput = panel.querySelector<HTMLInputElement>("#room-code");
  const createButton = panel.querySelector<HTMLButtonElement>("[data-create-room]");
  const joinButton = panel.querySelector<HTMLButtonElement>("[data-join-room]");
  const readyButton = panel.querySelector<HTMLButtonElement>("[data-ready-toggle]");
  const capsuleButton = panel.querySelector<HTMLButtonElement>("[data-test-capsule]");
  const previewFireButton = panel.querySelector<HTMLButtonElement>("[data-preview-fire]");
  const nextRoundButton = panel.querySelector<HTMLButtonElement>("[data-next-round]");
  const nameplateSelect = panel.querySelector<HTMLSelectElement>("[data-nameplate-select]");
  const roomBlock = panel.querySelector<HTMLElement>("[data-room-block]");
  const roomCodeLabel = panel.querySelector<HTMLElement>("[data-room-code]");
  const statusBadge = panel.querySelector<HTMLElement>("[data-status-badge]");
  const roomStatus = panel.querySelector<HTMLElement>("[data-room-status]");
  const playerList = panel.querySelector<HTMLElement>("[data-player-list]");
  const combatBlock = panel.querySelector<HTMLElement>("[data-combat-block]");
  const combatMeta = panel.querySelector<HTMLElement>("[data-combat-meta]");
  const vehicleList = panel.querySelector<HTMLElement>("[data-vehicle-list]");
  const rewardLog = panel.querySelector<HTMLElement>("[data-reward-log]");

  createButton?.addEventListener("click", async () => {
    await connect(() => client.create("gravity_canyon", { displayName: displayNameInput?.value }));
  });

  joinButton?.addEventListener("click", async () => {
    const roomCode = roomCodeInput?.value.trim();
    if (!roomCode) {
      setBadge("Room needed", "warn");
      return;
    }

    await connect(() => client.joinById(roomCode, { displayName: displayNameInput?.value }));
  });

  displayNameInput?.addEventListener("change", () => {
    room?.send("setDisplayName", displayNameInput.value);
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

  async function connect(join: () => Promise<OnlineRoom>) {
    try {
      setBadge("Connecting", "warn");
      room?.leave();
      room = await join();
      localReady = false;
      roomCodeInput!.value = room.roomId;
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
    roomStatus!.textContent = snapshot.status;
    rewardLog!.textContent = snapshot.lastRewardLog;

    const localPlayer = snapshot.players.find((player) => player.sessionId === room?.sessionId);
    if (localPlayer) {
      localReady = localPlayer.ready;
    }

    readyButton!.textContent = localReady ? "Unready" : "Ready";
    if (localPlayer && nameplateSelect) {
      const currentValue = nameplateSelect.value || localPlayer.equippedNameplate;
      nameplateSelect.innerHTML = localPlayer.inventory
        .map((nameplate) => `<option value="${escapeHtml(nameplate)}">${escapeHtml(nameplate)}</option>`)
        .join("");
      nameplateSelect.value = localPlayer.inventory.includes(currentValue)
        ? currentValue
        : localPlayer.equippedNameplate;
    }

    playerList!.innerHTML = snapshot.players
      .map((player) => {
        const ready = player.ready ? "Ready" : "Waiting";
        return `
          <div class="online-player online-player--${player.team}">
            <div>
              <strong>${escapeHtml(player.displayName)}</strong>
              <span>${escapeHtml(player.equippedNameplate)}</span>
            </div>
            <em>${ready}</em>
          </div>
        `;
      })
      .join("");

    renderCombat(snapshot);
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
    phase?: string;
    status?: string;
    lastRewardLog?: string;
    roundNumber?: number;
    turnNumber?: number;
    wind?: number;
    activeVehicleId?: string;
    winnerTeam?: string;
    players?: Map<string, unknown> | Record<string, unknown>;
    vehicles?: unknown[] | Iterable<unknown>;
  };

  return {
    roomCode: source.roomCode ?? "",
    phase: source.phase ?? "lobby",
    status: source.status ?? "",
    roundNumber: source.roundNumber ?? 1,
    turnNumber: source.turnNumber ?? 0,
    wind: source.wind ?? 0,
    activeVehicleId: source.activeVehicleId ?? "",
    winnerTeam: source.winnerTeam ?? "",
    lastRewardLog: source.lastRewardLog ?? "",
    players: getPlayers(source.players),
    vehicles: getVehicles(source.vehicles),
  };
}

function getPlayers(players: RoomSnapshot["players"] | Map<string, unknown> | Record<string, unknown> | undefined) {
  const snapshots: PlayerSnapshot[] = [];
  const readPlayer = (player: unknown, key: string) => {
    const source = player as {
      sessionId?: string;
      displayName?: string;
      team?: string;
      ready?: boolean;
      tokens?: number;
      equippedNameplate?: string;
      inventory?: string[] | Iterable<string>;
    };

    snapshots.push({
      sessionId: source.sessionId ?? key,
      displayName: source.displayName ?? "Guest",
      team: source.team ?? "red",
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
