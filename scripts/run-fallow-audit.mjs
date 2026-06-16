import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(".");
const auditsDir = join(root, "work", "audits");
const fullReport = join(auditsDir, "fallow-full.json");
const healthReport = join(auditsDir, "fallow-health.json");

function quoteForCmd(value) {
  const text = String(value);
  return /[\s&()^<>|"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function fallowLaunch(args) {
  if (process.platform !== "win32") {
    return { command: "npx", args: ["fallow", ...args] };
  }

  const commandLine = ["npx", "fallow", ...args.map(quoteForCmd)].join(" ");
  return { command: "cmd.exe", args: ["/d", "/s", "/c", commandLine] };
}

function runFallow(args, options = {}) {
  const launch = fallowLaunch(args);
  const result = spawnSync(launch.command, launch.args, {
    cwd: root,
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFindingExit) {
    throw new Error(`fallow ${args.join(" ")} exited ${result.status}.`);
  }

  return result.status ?? 0;
}

mkdirSync(dirname(fullReport), { recursive: true });

runFallow(["--format", "json", "--output-file", fullReport, "--no-cache"]);

const healthStatus = runFallow(["health", "--format", "json", "--output-file", healthReport, "--no-cache"], {
  allowFindingExit: true,
});

if (healthStatus !== 0 && !existsSync(healthReport)) {
  throw new Error(`fallow health exited ${healthStatus} before writing ${healthReport}.`);
}

console.log(`Wrote ${fullReport}.`);
console.log(`Wrote ${healthReport}.`);
