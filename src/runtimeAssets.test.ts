import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  CONCEPT_IMAGE_ASSETS,
  RUNTIME_IMAGE_ASSETS,
  STYLE_REFERENCE_ASSET,
} from "./runtimeAssets";

test("normal runtime image assets use optimized WebP delivery files", () => {
  for (const [key, path] of Object.entries(RUNTIME_IMAGE_ASSETS)) {
    assert.ok(path.endsWith(".webp"), `${key} should use a WebP delivery asset`);
    assert.ok(existsSync(join(process.cwd(), "public", path)), `${key} missing ${path}`);
  }
});

test("art-review concept images are kept separate from normal runtime assets", () => {
  for (const path of Object.values(CONCEPT_IMAGE_ASSETS)) {
    assert.match(path, /sprite-variants\//);
    assert.ok(path.endsWith(".webp"), `${path} should use a WebP delivery asset`);
    assert.ok(existsSync(join(process.cwd(), "public", path)), `missing ${path}`);
  }
});

test("style reference backdrop is an optimized optional asset", () => {
  assert.equal(STYLE_REFERENCE_ASSET, "assets/style-b-2v2-reference.webp");
  assert.ok(existsSync(join(process.cwd(), "public", STYLE_REFERENCE_ASSET)));
});
