export interface PlaytestLauncherOptions {
  build: boolean;
  tunnel: boolean;
  host: string;
  port: number;
}

const DEFAULT_PORT = 2567;
const DEFAULT_HOST = "127.0.0.1";
const CLOUDFLARED_URL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/i;

export function parsePlaytestArgs(args: string[]): PlaytestLauncherOptions {
  const options: PlaytestLauncherOptions = {
    build: true,
    tunnel: true,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--no-build") {
      options.build = false;
    } else if (arg === "--local" || arg === "--no-tunnel") {
      options.tunnel = false;
    } else if (arg === "--tunnel") {
      options.tunnel = true;
    } else if (arg === "--port") {
      options.port = parsePort(args[index + 1]);
      index += 1;
    } else if (arg.startsWith("--port=")) {
      options.port = parsePort(arg.slice("--port=".length));
    } else if (arg === "--host") {
      options.host = args[index + 1]?.trim() || DEFAULT_HOST;
      index += 1;
    } else if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length).trim() || DEFAULT_HOST;
    }
  }

  return options;
}

export function extractCloudflaredUrl(output: string): string | undefined {
  return output.match(CLOUDFLARED_URL_PATTERN)?.[0];
}

function parsePort(value: string | undefined): number {
  const parsed = Number(value ?? DEFAULT_PORT);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : DEFAULT_PORT;
}
