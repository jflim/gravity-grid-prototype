import assert from "node:assert/strict";
import test from "node:test";
import { DRAMATIC_VOID_DROP_FALL_SECONDS } from "../voidDropPresentation";
import { VoidZoneController } from "./VoidZoneController";
import type { VehicleState } from "./MatchTypes";

function createController(): VoidZoneController {
  return new VoidZoneController({
    worldWidth: 2400,
    terrainStep: 4,
    displaySize: { width: 238, height: 142 },
    visibleVoidZoneHeight: 240,
    horizontalPadding: 24,
    fallDurationSeconds: DRAMATIC_VOID_DROP_FALL_SECONDS,
  });
}

test("void zone controller creates void drop presentation inside the nearest readable void run", () => {
  const controller = createController();
  const presentation = controller.createVoidDropPresentation({
    fallStartX: 750,
    fallStartY: 600,
    visibleVoidTopY: 815,
    terrainBreakthroughY: 823,
    surfaceAt: (x) => (x >= 740 && x <= 1100 ? 1160 : 700),
  });

  assert.deepEqual(presentation, {
    fromX: 750,
    fromY: 600,
    targetX: 883,
    targetY: 974,
    age: 0,
    duration: DRAMATIC_VOID_DROP_FALL_SECONDS,
  });
});

test("void zone controller exposes consistent visible zone bounds", () => {
  const controller = createController();

  assert.equal(controller.terrainBreakthroughY(815), 823);
  assert.equal(controller.terrainPlatformBottomY(815), 815);
  assert.equal(controller.visibleVoidBottomY(815), 1055);
  assert.equal(controller.voidDropTargetY(815), 974);
});

test("void zone controller advances void drop presentation age without overshooting", () => {
  const controller = createController();
  const vehicles = [
    {
      voidDropPresentation: {
        fromX: 750,
        fromY: 600,
        targetX: 883,
        targetY: 974,
        age: DRAMATIC_VOID_DROP_FALL_SECONDS - 0.1,
        duration: DRAMATIC_VOID_DROP_FALL_SECONDS,
      },
    },
    {},
  ] as VehicleState[];

  controller.updatePresentations(vehicles, 0.25);

  assert.equal(vehicles[0]!.voidDropPresentation?.age, DRAMATIC_VOID_DROP_FALL_SECONDS);
});
