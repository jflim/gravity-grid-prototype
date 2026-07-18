import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("docs HTML generator is a committed local script pipeline", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };

  assert.equal(
    packageJson.scripts?.["docs:html"],
    "tsx scripts/build-map-previews.ts && tsx scripts/build-map-gameplay-review.ts && node scripts/build-docs-html.mjs",
  );
  assert.ok(existsSync("scripts/build-docs-html.mjs"), "markdown reading-copy generator exists locally");
  assert.ok(existsSync("scripts/build-map-previews.ts"), "map preview HTML generator exists locally");
  assert.ok(existsSync("scripts/build-map-gameplay-review.ts"), "map review HTML generator exists locally");
});

test("generated markdown reading copies point back to source markdown and local regeneration command", () => {
  const html = readFileSync("docs/GDD.html", "utf8");

  assert.match(html, /HTML reading copy generated from/);
  assert.match(html, /GDD\.md/);
  assert.match(html, /npm run docs:html/);
});
