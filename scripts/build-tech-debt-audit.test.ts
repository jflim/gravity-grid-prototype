import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("technical debt audit is a committed local docs command", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(packageJson.scripts?.["audit:debt"], "node scripts/build-tech-debt-audit.mjs && npm run docs:html");
  assert.ok(existsSync("scripts/build-tech-debt-audit.mjs"), "technical debt audit generator exists locally");
});

test("technical debt audit records requested graph and fallow passes", () => {
  const script = readFileSync("scripts/build-tech-debt-audit.mjs", "utf8");

  assert.match(script, /Graphify-style pass/);
  assert.match(script, /Fallow-style pass/);
  assert.match(script, /Dependency cycles found/);
  assert.match(script, /Highest Risk Godfile Candidates/);
});
