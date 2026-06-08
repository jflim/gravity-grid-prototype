import assert from "node:assert/strict";
import test from "node:test";
import { firstTerrainContact, firstVehicleContact } from "./projectileCollision";
import { distanceToVehicleHitZone } from "./vehicleHitZone";

test("terrain collision resolves at the first projectile-edge surface contact", () => {
  const contact = firstTerrainContact({
    startX: 100,
    startY: 460,
    endX: 100,
    endY: 540,
    projectileRadius: 11,
    worldWidth: 2400,
    surfaceAt: () => 500,
  });

  assert.ok(contact);
  assert.equal(contact.x, 100);
  assert.equal(contact.y, 500);
  assert.ok(Math.abs(contact.time - 0.3625) < 0.002, "contact should occur when projectile edge touches terrain");
});

test("terrain collision does not trigger while the projectile edge is still above terrain", () => {
  const contact = firstTerrainContact({
    startX: 100,
    startY: 430,
    endX: 180,
    endY: 480,
    projectileRadius: 11,
    worldWidth: 2400,
    surfaceAt: () => 500,
  });

  assert.equal(contact, undefined);
});

test("vehicle collision resolves on vehicle-body hit zones instead of unit art circles", () => {
  const contact = firstVehicleContact({
    startX: 100,
    startY: 500,
    endX: 220,
    endY: 500,
    projectileRadius: 10,
    zones: [
      {
        id: "target",
        centerX: 250,
        centerY: 500,
        width: 100,
        height: 80,
      },
    ],
  });

  assert.ok(contact);
  assert.equal(contact.id, "target");
  assert.equal(contact.x, 200);
  assert.equal(contact.y, 500);
});

test("effect distance uses the nearest vehicle-body edge", () => {
  const distance = distanceToVehicleHitZone(180, 500, {
    centerX: 250,
    centerY: 500,
    width: 100,
    height: 80,
  });

  assert.equal(distance, 20);
});
