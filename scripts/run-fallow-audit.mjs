import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { assertFallowStatus, runFallow } from "./fallow/runFallowCommand.mjs";

const root = resolve(".");
const auditsDir = join(root, "work", "audits");
const fullReport = join(auditsDir, "fallow-full.json");
const healthReport = join(auditsDir, "fallow-health.json");

mkdirSync(dirname(fullReport), { recursive: true });

assertFallowStatus(runFallow(["--format", "json", "--output-file", fullReport, "--no-cache"], { cwd: root }), [
  "--format",
  "json",
  "--output-file",
  fullReport,
  "--no-cache",
]);

const healthArgs = ["health", "--format", "json", "--output-file", healthReport, "--no-cache"];
const healthStatus = runFallow(healthArgs, { cwd: root }).status;

if (healthStatus !== 0 && !existsSync(healthReport)) {
  throw new Error(`fallow health exited ${healthStatus} before writing ${healthReport}.`);
}

console.log(`Wrote ${fullReport}.`);
console.log(`Wrote ${healthReport}.`);
