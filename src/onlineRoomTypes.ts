import type { RoomSnapshot } from "./onlineLobbySnapshot";

export type OnlineRoom = {
  roomId: string;
  sessionId: string;
  state: unknown;
  send: (type: string, message?: unknown) => void;
  leave: () => Promise<unknown> | unknown;
  onStateChange: (callback: (state: unknown) => void) => void;
  onLeave: (callback: () => void) => void;
};

export type OnlineClient = {
  joinOrCreate: (roomName: string, options?: Record<string, unknown>) => Promise<OnlineRoom>;
};

export type OnlineGameplaySession = {
  room: OnlineRoom;
  initialSnapshot: RoomSnapshot;
};
