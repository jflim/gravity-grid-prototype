import { resolveOnlineServerUrl } from "./onlineServerUrl";
import { createOnlineLobbyDom } from "./onlineLobbyDom";
import { getRoomSnapshot, type RoomSnapshot } from "./onlineLobbySnapshot";
import { stageForRoomPhase } from "./onlineLobbyView";

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
    capsuleClicked: () => room?.send("claimTestCapsule"),
    nameplateChanged: (nameplate) => room?.send("equipNameplate", { nameplate }),
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
    if (!snapshot || gameplayStarted) {
      return;
    }

    if (stageForRoomPhase(snapshot.phase) === "gameplay") {
      startGameplay();
      return;
    }

    const localPlayer = snapshot.players.find((player) => player.sessionId === room?.sessionId);
    if (localPlayer) {
      localReady = localPlayer.ready;
    }

    dom.renderLobby(snapshot, room?.sessionId ?? "", localReady, room?.roomId);
  }

  function startGameplay() {
    if (gameplayStarted) {
      return;
    }

    gameplayStarted = true;
    dom.remove();
    options.onGameplayStart?.();
  }
}

function createOnlineClient() {
  if (!window.Colyseus?.Client) {
    throw new Error("Colyseus browser SDK did not load.");
  }

  return new window.Colyseus.Client(serverUrl);
}
