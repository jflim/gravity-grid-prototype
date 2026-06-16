import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(".");
const localGraphify = join(
  root,
  "work",
  "graphify-venv",
  process.platform === "win32" ? "Scripts" : "bin",
  process.platform === "win32" ? "graphify.exe" : "graphify",
);
const graphify = existsSync(localGraphify) ? localGraphify : "graphify";

const result = spawnSync(graphify, ["hook-check"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
});

if (result.error?.code === "ENOENT") {
  console.warn("Graphify hook skipped: Graphify CLI is not installed. Install graphifyy to enable hook checks.");
  process.exit(0);
}

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
