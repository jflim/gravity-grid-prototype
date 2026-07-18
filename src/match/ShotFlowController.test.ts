import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_UNIT_DEFINITIONS } from "../../shared/content/v1Units.js";
import type { TeamId } from "../../shared/model/gameTypes.js";
import { ShotFlowController, type ShotFlowControllerOptions } from "./ShotFlowController";
import type { ProjectileState, SettleOptions, VehicleState } from "./MatchTypes";

function vehicle(overrides: Partial<VehicleState> = {}): VehicleState {
  return {
    ...DEMO_UNIT_DEFINITIONS[0]!,
    x: 100,
    y: 200,
    hp: 100,
    angle: 47,
    facing: 1,
    moveUnits: 10,
    alive: true,
    ...overrides,
  };
}

function projectile(overrides: Partial<ProjectileState> = {}): ProjectileState {
  return {
    x: 100,
    y: 200,
    vx: 50,
    vy: -30,
    shooterId: "red-1",
    team: "red",
    trail: [],
    ...overrides,
  };
}

function createHarness(overrides: Partial<ShotFlowControllerOptions> = {}) {
  const events: string[] = [];
  const createdProjectile = projectile();
  const controller = new ShotFlowController({
    projectileController: {
      createProjectile: () => createdProjectile,
      advance: () => ({ kind: "in-flight" }),
    },
    impactController: {
      resolve: () => ({
        impactPreview: {
          x: 120,
          y: 340,
          craterRadius: 50,
          damageRadius: 75,
          isBungerShot: false,
          timeLeft: 0.75,
        },
        shotResult: "Vesper -34",
      }),
      preview: () => ({
        impactPreview: {
          x: 120,
          y: 340,
          craterRadius: 50,
          damageRadius: 75,
          isBungerShot: false,
          timeLeft: 0.75,
        },
        shotResult: "Server shot replay impacted.",
      }),
    },
    surfaceAt: () => 500,
    hitZoneFor: (target) => ({ centerX: target.x, centerY: target.y, width: 80, height: 40 }),
    makeCrater: (x, y, radius, depthFactor) => {
      events.push(`crater:${x}:${y}:${radius}:${depthFactor}`);
    },
    settleVehicles: (_options: SettleOptions) => [],
    addCombatMarker: (_target, kind, label) => events.push(`marker:${kind}:${label}`),
    recenterForProjectileIfNeeded: (activeProjectile) => events.push(`recenter:${activeProjectile.x}`),
    winningTeam: () => undefined,
    ...overrides,
  });

  return {
    controller,
    events,
    createdProjectile,
  };
}

test("shot flow creates projectile state and readable shot text", () => {
  const active = vehicle({ username: "Nova" });
  const { controller, createdProjectile } = createHarness();

  const result = controller.fire(active, 50);

  assert.equal(result.projectile, createdProjectile);
  assert.equal(result.shotResult, "Nova fired.");
});

test("shot flow advances in-flight projectiles and recenters the camera hook", () => {
  const activeProjectile = projectile({ x: 150 });
  const { controller, events } = createHarness();

  const result = controller.advanceProjectile({
    projectile: activeProjectile,
    vehicles: [vehicle()],
    wind: 0.5,
    deltaSeconds: 0.1,
  });

  assert.deepEqual(result, { kind: "in-flight" });
  assert.deepEqual(events, ["recenter:150"]);
});

test("shot flow resolves out-of-bounds shots into a delayed turn advance", () => {
  const { controller } = createHarness({
    projectileController: {
      createProjectile: () => projectile(),
      advance: () => ({ kind: "out-of-bounds" }),
    },
  });

  const result = controller.advanceProjectile({
    projectile: projectile(),
    vehicles: [vehicle()],
    wind: 0,
    deltaSeconds: 0.1,
  });

  assert.deepEqual(result, {
    kind: "resolved",
    projectile: undefined,
    impactPreview: undefined,
    shotResult: "Shot flew out of bounds.",
    nextEvent: { kind: "advance-turn", delayMs: 700 },
  });
});

test("shot flow resolves projectile impacts and selects round-end when a team has won", () => {
  const { controller } = createHarness({
    projectileController: {
      createProjectile: () => projectile(),
      advance: () => ({
        kind: "collision",
        collision: { x: 120, y: 340, directHitId: "blue-1" },
      }),
    },
    winningTeam: (): TeamId => "red",
  });

  const result = controller.advanceProjectile({
    projectile: projectile(),
    vehicles: [vehicle()],
    wind: 0,
    deltaSeconds: 0.1,
  });

  assert.equal(result.kind, "resolved");
  if (result.kind !== "resolved") {
    return;
  }
  assert.equal(result.impactPreview?.x, 120);
  assert.equal(result.impactPreview?.y, 340);
  assert.equal(result.shotResult, "Vesper -34");
  assert.deepEqual(result.nextEvent, { kind: "end-round", delayMs: 900 });
});

test("shot flow shows visual server replay impacts without resolving damage locally", () => {
  let impactResolved = false;
  const { controller, events } = createHarness({
    projectileController: {
      createProjectile: () => projectile(),
      advance: () => ({
        kind: "collision",
        collision: { x: 120, y: 340, directHitId: "blue-1" },
      }),
    },
    impactController: {
      resolve: () => {
        impactResolved = true;
        throw new Error("Visual replay should not resolve impact locally");
      },
      preview: () => ({
        impactPreview: {
          x: 120,
          y: 340,
          craterRadius: 50,
          damageRadius: 75,
          isBungerShot: false,
          timeLeft: 0.75,
        },
        shotResult: "Server shot replay impacted.",
      }),
    },
  });

  const result = controller.advanceVisualProjectile({
    projectile: projectile(),
    vehicles: [vehicle()],
    wind: 0,
    deltaSeconds: 0.1,
  });

  assert.equal(result.kind, "resolved");
  if (result.kind !== "resolved") {
    return;
  }
  assert.equal(impactResolved, false);
  assert.deepEqual(result.impactPreview, {
    x: 120,
    y: 340,
    craterRadius: 50,
    damageRadius: 75,
    isBungerShot: false,
    timeLeft: 0.75,
  });
  assert.equal(result.shotResult, "Server shot replay impacted.");
  assert.deepEqual(events, ["recenter:100"]);
});
