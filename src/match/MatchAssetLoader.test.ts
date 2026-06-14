import assert from "node:assert/strict";
import test from "node:test";
import { buildMatchAssetLoadPlan } from "./MatchAssetLoader";

test("match asset load plan includes runtime art by default", () => {
  const plan = buildMatchAssetLoadPlan({
    includeConceptPreviewAssets: false,
    includeStyleReferenceBackground: false,
  });

  assert.ok(plan.runtimeImages.some((asset) => asset.key === "nova-unit-default"));
  assert.ok(plan.runtimeImages.some((asset) => asset.key === "vesper-unit-default"));
  assert.equal(plan.conceptImages.length, 0);
  assert.equal(plan.styleReference, undefined);
});

test("match asset load plan keeps concept and style-reference assets explicit opt-in", () => {
  const plan = buildMatchAssetLoadPlan({
    includeConceptPreviewAssets: true,
    includeStyleReferenceBackground: true,
  });

  assert.ok(plan.conceptImages.some((asset) => asset.key === "nova-unit-default-concept"));
  assert.equal(plan.styleReference?.key, "style-reference");
});
