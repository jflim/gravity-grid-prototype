import assert from "node:assert/strict";
import test from "node:test";
import {
  isProjectileOutOfBounds,
  launchProjectile,
  stepProjectile,
} from "./projectile.js";

test("launchProjectile creates the same muzzle and velocity as the local scene", () => {
  const projectile = launchProjectile({
    shooterX: 100,
    shooterY: 200,
    angleDeg: 0,
    power: 50,
    maxPower: 100,
    shotSpeedMin: 240,
    shotSpeedMax: 780,
    muzzleDistance: 48,
    muzzleYOffset: -13,
  });

  assert.deepEqual(projectile, {
    x: 148,
    y: 187,
    vx: 510,
    vy: -0,
  });
});

test("launchProjectile supports upper artillery angles", () => {
  const projectile = launchProjectile({
    shooterX: 100,
    shooterY: 200,
    angleDeg: 90,
    power: 100,
    maxPower: 100,
    shotSpeedMin: 240,
    shotSpeedMax: 780,
    muzzleDistance: 48,
    muzzleYOffset: -13,
  });

  assert.equal(Math.round(projectile.x), 100);
  assert.equal(projectile.y, 139);
  assert.equal(Math.round(projectile.vx), 0);
  assert.equal(projectile.vy, -780);
});

test("stepProjectile applies wind and gravity before moving position", () => {
  const stepped = stepProjectile({
    projectile: {
      x: 100,
      y: 200,
      vx: 10,
      vy: -20,
    },
    deltaSeconds: 0.5,
    wind: 2,
    windForce: 34,
    gravity: 440,
  });

  assert.deepEqual(stepped, {
    startX: 100,
    startY: 200,
    endX: 122,
    endY: 300,
    projectile: {
      x: 122,
      y: 300,
      vx: 44,
      vy: 200,
    },
  });
});

test("isProjectileOutOfBounds uses the current local miss boundaries", () => {
  const bounds = {
    worldWidth: 2400,
    worldHeight: 900,
    lowerYMargin: 120,
    upperYMargin: 220,
  };

  assert.equal(isProjectileOutOfBounds({ x: -1, y: 100 }, bounds), true);
  assert.equal(isProjectileOutOfBounds({ x: 2401, y: 100 }, bounds), true);
  assert.equal(isProjectileOutOfBounds({ x: 100, y: 1021 }, bounds), true);
  assert.equal(isProjectileOutOfBounds({ x: 100, y: -221 }, bounds), true);
  assert.equal(isProjectileOutOfBounds({ x: 100, y: 100 }, bounds), false);
});
