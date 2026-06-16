import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { runFallow } from "./fallow/runFallowCommand.mjs";

const root = resolve(".");
const outputPath = join(root, "work", "audits", "fallow-audit.json");
const auditArgs = ["audit", "--gate", "all", "--format", "json", "--output-file", outputPath, "--no-cache"];

mkdirSync(dirname(outputPath), { recursive: true });

const result = runFallow(auditArgs, { cwd: root, capture: true });

if (result.stdout) {
  process.stdout.write(result.stdout);
}

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (existsSync(outputPath)) {
  console.log(`Wrote ${outputPath}.`);
}

process.exit(result.status);
