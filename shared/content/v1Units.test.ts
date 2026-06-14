import assert from "node:assert/strict";
import test from "node:test";
import { CHARACTER_IDS } from "../model/gameTypes.js";
import {
  SHARED_V1_VEHICLE_HIT_ZONE,
  V1_DEMO_UNIT_DEFINITIONS,
  unitDefinitionForCharacter,
} from "./v1Units.js";

test("v1 demo unit content covers the locked four-character roster once", () => {
  const characterIds = V1_DEMO_UNIT_DEFINITIONS.map((unit) => unit.characterId).sort();

  assert.deepEqual(characterIds, [...CHARACTER_IDS].sort());
  assert.equal(V1_DEMO_UNIT_DEFINITIONS.length, 4);
});

test("v1 unit content preserves current class and sprite wiring", () => {
  assert.equal(unitDefinitionForCharacter("nova").classId, "bunger");
  assert.equal(unitDefinitionForCharacter("vesper").classId, "glitch");
  assert.equal(unitDefinitionForCharacter("kaelii").classId, "bouncer");
  assert.equal(unitDefinitionForCharacter("perlah").classId, "spark");

  for (const unit of V1_DEMO_UNIT_DEFINITIONS) {
    assert.equal(unit.combatHull, SHARED_V1_VEHICLE_HIT_ZONE);
    assert.ok(unit.characterSpriteKeys.default.length > 0, `${unit.characterId} default sprite missing`);
    assert.ok(unit.characterSpriteKeys.ko.length > 0, `${unit.characterId} KO sprite missing`);
    assert.ok(unit.characterSpriteKeys.intense.length > 0, `${unit.characterId} intense sprite missing`);
    assert.ok(unit.portraitKey.length > 0, `${unit.characterId} HUD portrait missing`);
  }
});
