import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export const defaultRoot = resolve(".");

export function quoteForCmd(value) {
  const text = String(value);
  return /[\s&()^<>|"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function fallowLaunch(args) {
  if (process.platform !== "win32") {
    return { command: "npx", args: ["fallow", ...args] };
  }

  const commandLine = ["npx", "fallow", ...args.map(quoteForCmd)].join(" ");
  return { command: "cmd.exe", args: ["/d", "/s", "/c", commandLine] };
}

export function runFallow(args, options = {}) {
  const launch = fallowLaunch(args);
  const result = spawnSync(launch.command, launch.args, {
    cwd: options.cwd ?? defaultRoot,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function assertFallowStatus(result, args, options = {}) {
  if (result.status !== 0 && !options.allowFindingExit) {
    throw new Error(`fallow ${args.join(" ")} exited ${result.status}.`);
  }
}
