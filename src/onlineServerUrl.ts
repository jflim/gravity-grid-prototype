export interface OnlineServerLocation {
  protocol: string;
  hostname: string;
  host: string;
  port: string;
}

const COLYSEUS_PORT = "2567";
const VITE_DEV_PORTS = new Set(["5173", "5174"]);

export function resolveOnlineServerUrl(location: OnlineServerLocation, overrideUrl?: string): string {
  const override = overrideUrl?.trim();
  if (override) {
    return override;
  }

  const websocketProtocol = location.protocol === "https:" ? "wss" : "ws";

  if (location.protocol !== "http:" && location.protocol !== "https:") {
    return `${websocketProtocol}://127.0.0.1:${COLYSEUS_PORT}`;
  }

  const hostname = location.hostname || "127.0.0.1";
  if (VITE_DEV_PORTS.has(location.port)) {
    return `${websocketProtocol}://${hostname}:${COLYSEUS_PORT}`;
  }

  return `${websocketProtocol}://${location.host || `${hostname}:${COLYSEUS_PORT}`}`;
}
