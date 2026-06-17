import { resolveOnlineServerUrl } from "./onlineServerUrl";
import { createOnlineLobbyDom } from "./onlineLobbyDom";
import { getRoomSnapshot, type RoomSnapshot } from "./onlineLobbySnapshot";
import { stageForRoomPhase } from "./onlineLobbyView";
import type { OnlineClient, OnlineGameplaySession, OnlineRoom } from "./onlineRoomTypes";

type OnlineLobbyOptions = {
  onGameplayStart?: (session: OnlineGameplaySession) => void;
};

type LobbyRenderAction =
  | { type: "skip" }
  | { type: "start-gameplay"; snapshot: RoomSnapshot }
  | { type: "show-lobby"; snapshot: RoomSnapshot };

type LobbyRenderHandlers = {
  startGameplay: (snapshot: RoomSnapshot) => void;
  showLobby: (snapshot: RoomSnapshot) => void;
};

const skipLobbyRender: LobbyRenderAction = { type: "skip" };

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
  const client = createOnlineClient();
  let room: OnlineRoom | undefined;
  let latestSnapshot: RoomSnapshot | undefined;
  let localReady = false;
  let gameplayStarted = false;

  const dom = createOnlineLobbyDom(document, {
    reconnect: () => void connectAutoRoom(),
    displayNameChanged: (value) => room?.send("setDisplayName", value),
    modeChanged: (mode) => room?.send("setMode", { mode }),
    slotChanged: (slotId, characterId) => room?.send("selectCharacter", { slotId, characterId }),
    readyClicked: () => {
      localReady = !localReady;
      room?.send("setReady", { ready: localReady });
      render(latestSnapshot);
    },
  });

  document.body.appendChild(dom.stage);

  void connectAutoRoom();

  function connectAutoRoom() {
    return connect(() => client.joinOrCreate("gravity_canyon", { displayName: dom.displayName() }));
  }

  async function connect(join: () => Promise<OnlineRoom>) {
    try {
      dom.setBadge("Connecting", "warn");
      room?.leave();
      room = await join();
      localReady = false;
      dom.setBadge("Online", "ok");

      room.onStateChange((state) => {
        latestSnapshot = getRoomSnapshot(state);
        render(latestSnapshot);
      });

      room.onLeave(() => {
        dom.setBadge("Offline", "neutral");
      });
    } catch (error) {
      dom.setBadge("Server off", "error");
      console.error(error);
    }
  }

  function render(snapshot?: RoomSnapshot) {
    applyLobbyRenderAction(nextLobbyRenderAction(snapshot, gameplayStarted), {
      startGameplay,
      showLobby: renderLobbySnapshot,
    });
  }

  function renderLobbySnapshot(snapshot: RoomSnapshot) {
    const localSessionId = onlineRoomSessionId(room);
    localReady = syncedReadyState(snapshot, localSessionId, localReady);
    dom.renderLobby(snapshot, localSessionId, localReady, onlineRoomId(room));
  }

  function startGameplay(snapshot: RoomSnapshot) {
    if (gameplayStarted || !room) {
      return;
    }

    gameplayStarted = true;
    dom.remove();
    options.onGameplayStart?.({
      room,
      initialSnapshot: snapshot,
    });
  }
}

function createOnlineClient() {
  if (!window.Colyseus?.Client) {
    throw new Error("Colyseus browser SDK did not load.");
  }

  return new window.Colyseus.Client(serverUrl);
}

function onlineRoomSessionId(room: OnlineRoom | undefined): string {
  return room ? room.sessionId : "";
}

function onlineRoomId(room: OnlineRoom | undefined): string | undefined {
  return room ? room.roomId : undefined;
}

function nextLobbyRenderAction(snapshot: RoomSnapshot | undefined, gameplayStarted: boolean): LobbyRenderAction {
  if (gameplayStarted) {
    return skipLobbyRender;
  }

  if (!snapshot) {
    return skipLobbyRender;
  }

  if (shouldStartGameplay(snapshot)) {
    return { type: "start-gameplay", snapshot };
  }

  return { type: "show-lobby", snapshot };
}

function applyLobbyRenderAction(action: LobbyRenderAction, handlers: LobbyRenderHandlers): void {
  switch (action.type) {
    case "start-gameplay":
      handlers.startGameplay(action.snapshot);
      return;
    case "show-lobby":
      handlers.showLobby(action.snapshot);
      return;
  }
}

function shouldStartGameplay(snapshot: RoomSnapshot): boolean {
  return stageForRoomPhase(snapshot.phase) === "gameplay";
}

function syncedReadyState(
  snapshot: RoomSnapshot,
  localSessionId: string | undefined,
  currentReady: boolean,
): boolean {
  const localPlayer = snapshot.players.find((player) => player.sessionId === localSessionId);
  return localPlayer?.ready ?? currentReady;
}
