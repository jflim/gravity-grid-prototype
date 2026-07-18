import assert from "node:assert/strict";
import test from "node:test";
import {
  ProjectileController,
  type ProjectileControllerOptions,
} from "./ProjectileController";

const baseOptions: ProjectileControllerOptions = {
  projectileRadius: 10,
  maxPower: 100,
  shotSpeedMin: 240,
  shotSpeedMax: 780,
  muzzleDistance: 48,
  muzzleYOffset: -13,
  windForce: 34,
  gravity: 0,
  worldWidth: 2400,
  worldHeight: 900,
  lowerYMargin: 120,
  upperYMargin: 220,
  maxTrailPoints: 34,
};

test("projectile controller creates launched projectiles with shooter context", () => {
  const controller = createController();

  const projectile = controller.createProjectile(
    {
      id: "red-1",
      team: "red",
      x: 100,
      y: 200,
      angle: 0,
    },
    50,
  );

  assert.equal(projectile.shooterId, "red-1");
  assert.equal(projectile.team, "red");
  assert.equal(projectile.x, 148);
  assert.equal(projectile.y, 187);
  assert.equal(projectile.vx, 510);
  assert.equal(projectile.vy, -0);
  assert.deepEqual(projectile.trail, []);
});

test("projectile controller advances in-flight projectiles and records a trail", () => {
  const controller = createController();
  const projectile = {
    x: 100,
    y: 200,
    vx: 20,
    vy: -10,
    shooterId: "red-1",
    team: "red" as const,
    trail: [],
  };

  const result = controller.advance({
    projectile,
    deltaSeconds: 0.5,
    wind: 2,
    targets: [],
    surfaceAt: () => 800,
  });

  assert.equal(result.kind, "in-flight");
  assert.deepEqual(projectile.trail, [{ x: 100, y: 200 }]);
  assert.deepEqual(
    {
      x: projectile.x,
      y: projectile.y,
      vx: projectile.vx,
      vy: projectile.vy,
    },
    {
      x: 127,
      y: 195,
      vx: 54,
      vy: -10,
    },
  );
});

test("projectile controller reports enemy vehicle collisions before terrain", () => {
  const controller = createController();
  const projectile = {
    x: 100,
    y: 500,
    vx: 120,
    vy: 0,
    shooterId: "red-1",
    team: "red" as const,
    trail: [],
  };

  const result = controller.advance({
    projectile,
    deltaSeconds: 1,
    wind: 0,
    surfaceAt: () => 800,
    targets: [
      {
        id: "red-1",
        team: "red",
        alive: true,
        hitZone: { centerX: 130, centerY: 500, width: 80, height: 60 },
      },
      {
        id: "red-2",
        team: "red",
        alive: true,
        hitZone: { centerX: 170, centerY: 500, width: 80, height: 60 },
      },
      {
        id: "blue-1",
        team: "blue",
        alive: false,
        hitZone: { centerX: 190, centerY: 500, width: 80, height: 60 },
      },
      {
        id: "blue-2",
        team: "blue",
        alive: true,
        hitZone: { centerX: 250, centerY: 500, width: 100, height: 80 },
      },
    ],
  });

  assert.deepEqual(result, {
    kind: "collision",
    collision: {
      x: 200,
      y: 500,
      directHitId: "blue-2",
    },
  });
  assert.equal(projectile.x, 200);
  assert.equal(projectile.y, 500);
});

test("projectile controller keeps the server replay direct-hit target collidable after hp sync", () => {
  const controller = createController();
  const projectile = {
    x: 100,
    y: 500,
    vx: 120,
    vy: 0,
    shooterId: "red-1",
    team: "red" as const,
    trail: [],
    serverReplayDirectHitId: "blue-1",
  };

  const result = controller.advance({
    projectile,
    deltaSeconds: 1,
    wind: 0,
    surfaceAt: () => 800,
    targets: [
      {
        id: "blue-1",
        team: "blue",
        alive: false,
        hitZone: { centerX: 190, centerY: 500, width: 80, height: 60 },
      },
    ],
  });

  assert.deepEqual(result, {
    kind: "collision",
    collision: {
      x: 150,
      y: 500,
      directHitId: "blue-1",
    },
  });
});

test("projectile controller reports terrain collisions", () => {
  const controller = createController({ projectileRadius: 11 });
  const projectile = {
    x: 100,
    y: 460,
    vx: 0,
    vy: 80,
    shooterId: "red-1",
    team: "red" as const,
    trail: [],
  };

  const result = controller.advance({
    projectile,
    deltaSeconds: 1,
    wind: 0,
    targets: [],
    surfaceAt: () => 500,
  });

  assert.equal(result.kind, "collision");
  if (result.kind !== "collision") {
    return;
  }
  assert.equal(result.collision.x, 100);
  assert.equal(result.collision.y, 500);
  assert.equal(result.collision.directHitId, undefined);
});

test("projectile controller reports out-of-bounds shots", () => {
  const controller = createController({ worldWidth: 100 });
  const projectile = {
    x: 95,
    y: 200,
    vx: 20,
    vy: 0,
    shooterId: "red-1",
    team: "red" as const,
    trail: [],
  };

  const result = controller.advance({
    projectile,
    deltaSeconds: 0.5,
    wind: 0,
    targets: [],
    surfaceAt: () => 800,
  });

  assert.equal(result.kind, "out-of-bounds");
  assert.equal(projectile.x, 105);
});

function createController(overrides: Partial<ProjectileControllerOptions> = {}): ProjectileController {
  return new ProjectileController({
    ...baseOptions,
    ...overrides,
  });
}
