import assert from "node:assert/strict";
import test from "node:test";
import type { MatchInputSnapshot } from "./MatchInputController";
import { canLocalPlayerControlTurn, inputForTurnAuthority } from "./MatchTurnIntents";
import type { VehicleState } from "./MatchTypes";

const turnInput: MatchInputSnapshot = {
  aimUp: true,
  aimDown: false,
  moveLeft: false,
  moveRight: true,
  chargeHeld: true,
  resetPressed: true,
  collisionZonesTogglePressed: true,
  soundMuteTogglePressed: true,
};

test("inputForTurnAuthority keeps local demo input unchanged without an online publisher", () => {
  assert.deepEqual(inputForTurnAuthority(turnInput, vehicle("red-1"), undefined), turnInput);
});

test("inputForTurnAuthority removes turn controls when the local client does not own the active vehicle", () => {
  const gated = inputForTurnAuthority(turnInput, vehicle("red-1"), {
    canControlVehicle: () => false,
    submitAim: () => undefined,
    submitMove: () => undefined,
    submitFire: () => undefined,
  });

  assert.equal(gated.aimUp, false);
  assert.equal(gated.moveRight, false);
  assert.equal(gated.chargeHeld, false);
  assert.equal(gated.resetPressed, true);
  assert.equal(gated.collisionZonesTogglePressed, true);
  assert.equal(gated.soundMuteTogglePressed, true);
});

test("inputForTurnAuthority keeps turn controls for the owning active client", () => {
  assert.deepEqual(
    inputForTurnAuthority(turnInput, vehicle("red-1"), {
      canControlVehicle: (vehicleId) => vehicleId === "red-1",
      submitAim: () => undefined,
      submitMove: () => undefined,
      submitFire: () => undefined,
    }),
    turnInput,
  );
});

test("canLocalPlayerControlTurn identifies local demo and remote online turns", () => {
  assert.equal(canLocalPlayerControlTurn("red-1", undefined), true);
  assert.equal(
    canLocalPlayerControlTurn("red-1", {
    canControlVehicle: (vehicleId) => vehicleId === "blue-1",
    submitAim: () => undefined,
    submitMove: () => undefined,
    submitFire: () => undefined,
  }),
    false,
  );
});

function vehicle(id: string): VehicleState {
  return { id } as VehicleState;
}
