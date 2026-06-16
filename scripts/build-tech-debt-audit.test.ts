import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("technical debt audit is a committed local docs command", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  assert.equal(packageJson.scripts?.["audit:graphify"], "node scripts/run-graphify-audit.mjs");
  assert.equal(packageJson.scripts?.["audit:fallow"], "node scripts/run-fallow-audit.mjs");
  assert.equal(packageJson.scripts?.["audit:fallow:changed"], "node scripts/run-fallow-changed-audit.mjs");
  assert.equal(
    packageJson.scripts?.["audit:debt"],
    "npm run audit:graphify && npm run audit:fallow && node scripts/build-tech-debt-audit.mjs && npm run docs:html",
  );
  assert.ok(packageJson.devDependencies?.fallow, "Fallow is installed as a repo dev dependency");
  assert.ok(existsSync("scripts/build-tech-debt-audit.mjs"), "technical debt audit generator exists locally");
  assert.ok(existsSync("scripts/run-graphify-audit.mjs"), "Graphify audit runner exists locally");
  assert.ok(existsSync("scripts/run-fallow-audit.mjs"), "Fallow audit runner exists locally");
  assert.ok(existsSync("scripts/run-fallow-changed-audit.mjs"), "Fallow changed-files gate exists locally");
});

test("technical debt audit records Graphify and Fallow evidence", () => {
  const script = readFileSync("scripts/build-tech-debt-audit.mjs", "utf8");
  const gitignore = readFileSync(".gitignore", "utf8");

  assert.match(script, /Graphify evidence/);
  assert.match(script, /Fallow evidence/);
  assert.match(script, /Dependency cycles found/);
  assert.match(script, /Highest Risk Godfile Candidates/);
  assert.match(gitignore, /graphify-out\//);
  assert.match(gitignore, /\.graphify\//);
});

test("Fallow runner launches through cmd on Windows", () => {
  const script = readFileSync("scripts/run-fallow-audit.mjs", "utf8");
  const helper = readFileSync("scripts/fallow/runFallowCommand.mjs", "utf8");

  assert.match(script, /runFallow/);
  assert.match(helper, /cmd\.exe/);
  assert.doesNotMatch(script, /spawnSync\(npx/);
});

test("Fallow changed-files audit is a real commit gate", () => {
  const script = readFileSync("scripts/run-fallow-changed-audit.mjs", "utf8");
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.match(script, /"audit"/);
  assert.match(script, /"all"/);
  assert.match(script, /fallow-audit\.json/);
  assert.match(script, /process\.exit/);
  assert.equal(packageJson.scripts?.["audit:fallow:changed"], "node scripts/run-fallow-changed-audit.mjs");
});

test("technical debt audit generator keeps human-sized modules", () => {
  const entry = readFileSync("scripts/build-tech-debt-audit.mjs", "utf8");

  assert.ok(existsSync("scripts/techDebtAudit/localMetrics.mjs"));
  assert.ok(existsSync("scripts/techDebtAudit/toolEvidence.mjs"));
  assert.ok(existsSync("scripts/techDebtAudit/markdownTables.mjs"));
  assert.ok(
    entry.split(/\r?\n/).filter((line) => line.trim()).length <= 220,
    "build-tech-debt-audit.mjs should stay a thin report composer",
  );
});
