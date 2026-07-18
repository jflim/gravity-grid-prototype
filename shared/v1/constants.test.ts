import assert from "node:assert/strict";
import test from "node:test";
import { TURN_SECONDS } from "./constants.js";

test("v1 turn timer is owned by one shared constant", () => {
  assert.equal(TURN_SECONDS, 20);
});
