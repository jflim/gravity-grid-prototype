export interface ServerConfig {
  host: string;
  port: number;
  publicPreview: boolean;
  serveClient: boolean;
  onlinePanel: boolean;
}

export type ServerEnv = Partial<Record<"HOST" | "PORT" | "PUBLIC_PREVIEW" | "SERVE_CLIENT" | "ONLINE_PANEL", string>>;

const DEFAULT_PORT = 2567;
const LOCALHOST = "127.0.0.1";

export function resolveServerConfig(env: ServerEnv): ServerConfig {
  const publicPreview = isTruthy(env.PUBLIC_PREVIEW);
  const serveClient = publicPreview || isTruthy(env.SERVE_CLIENT);
  const onlinePanel = env.ONLINE_PANEL === undefined ? publicPreview : isTruthy(env.ONLINE_PANEL);
  const host = env.HOST?.trim() || LOCALHOST;
  const port = parsePort(env.PORT);

  return {
    host,
    port,
    publicPreview,
    serveClient,
    onlinePanel,
  };
}

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? DEFAULT_PORT);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : DEFAULT_PORT;
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}
