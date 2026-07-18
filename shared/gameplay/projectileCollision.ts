import {
  closestPointOnVehicleHitZone,
  vehicleHitZoneBounds,
  type VehicleHitZone,
} from "./vehicleHitZone.js";

export interface TerrainContactInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  projectileRadius: number;
  worldWidth: number;
  surfaceAt: (x: number) => number;
}

export interface ProjectileContact {
  x: number;
  y: number;
  time: number;
}

export interface VehicleContactZone extends VehicleHitZone {
  id: string;
}

export interface VehicleContactInput {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  projectileRadius: number;
  zones: VehicleContactZone[];
}

export interface VehicleContact extends ProjectileContact {
  id: string;
}

export interface ProjectileCollisionContact {
  x: number;
  y: number;
  directHitId?: string;
}

export function firstProjectileCollisionContact(
  vehicleContact: VehicleContact | undefined,
  terrainContact: ProjectileContact | undefined,
): ProjectileCollisionContact | undefined {
  const contact = earliestContact([
    vehicleContact ? vehicleCollisionContact(vehicleContact) : undefined,
    terrainContact ? terrainCollisionContact(terrainContact) : undefined,
  ]);
  return contact ? { x: contact.x, y: contact.y, directHitId: contact.directHitId } : undefined;
}

export function firstTerrainContact(input: TerrainContactInput): ProjectileContact | undefined {
  const distance = Math.hypot(input.endX - input.startX, input.endY - input.startY);
  const steps = Math.max(4, Math.ceil(distance / 6));
  let previousTime = 0;

  for (let i = 1; i <= steps; i += 1) {
    const time = i / steps;
    if (!terrainOverlapsProjectileAt(input, time)) {
      previousTime = time;
      continue;
    }

    return terrainContactAt(input, refinedTerrainContactTime(input, previousTime, time));
  }

  return undefined;
}

export function firstVehicleContact(input: VehicleContactInput): VehicleContact | undefined {
  return earliestContact(input.zones.map((zone) => vehicleContactForZone(input, zone)));
}

function terrainOverlapsProjectileAt(input: TerrainContactInput, time: number): boolean {
  const x = lerp(input.startX, input.endX, time);
  if (x < 0 || x > input.worldWidth) {
    return false;
  }

  const y = lerp(input.startY, input.endY, time);
  return y + input.projectileRadius >= input.surfaceAt(x);
}

function refinedTerrainContactTime(input: TerrainContactInput, lowStart: number, highStart: number): number {
  let low = lowStart;
  let high = highStart;

  for (let refine = 0; refine < 12; refine += 1) {
    const mid = (low + high) / 2;
    if (terrainOverlapsProjectileAt(input, mid)) {
      high = mid;
      continue;
    }

    low = mid;
  }

  return high;
}

function terrainContactAt(input: TerrainContactInput, time: number): ProjectileContact {
  const x = lerp(input.startX, input.endX, time);
  return {
    x,
    y: input.surfaceAt(x),
    time,
  };
}

function vehicleContactForZone(input: VehicleContactInput, zone: VehicleContactZone): VehicleContact | undefined {
  const time = sweptAabbContactTime(input, zone);
  if (time === undefined) {
    return undefined;
  }

  const centerX = lerp(input.startX, input.endX, time);
  const centerY = lerp(input.startY, input.endY, time);
  const contact = closestPointOnVehicleHitZone(centerX, centerY, zone);
  return {
    id: zone.id,
    x: contact.x,
    y: contact.y,
    time,
  };
}

function sweptAabbContactTime(input: VehicleContactInput, zone: VehicleContactZone): number | undefined {
  const bounds = vehicleHitZoneBounds(zone);
  const expanded = {
    left: bounds.left - input.projectileRadius,
    right: bounds.right + input.projectileRadius,
    top: bounds.top - input.projectileRadius,
    bottom: bounds.bottom + input.projectileRadius,
  };
  const dx = input.endX - input.startX;
  const dy = input.endY - input.startY;

  const xTimes = axisTimes(input.startX, dx, expanded.left, expanded.right);
  const yTimes = axisTimes(input.startY, dy, expanded.top, expanded.bottom);
  const interval = intersectAxisTimes(xTimes, yTimes);

  return contactTimeFromInterval(interval);
}

function axisTimes(start: number, delta: number, min: number, max: number): { entry: number; exit: number } | undefined {
  if (Math.abs(delta) < Number.EPSILON) {
    return start >= min && start <= max ? { entry: 0, exit: 1 } : undefined;
  }

  const t1 = (min - start) / delta;
  const t2 = (max - start) / delta;
  return {
    entry: Math.min(t1, t2),
    exit: Math.max(t1, t2),
  };
}

function intersectAxisTimes(
  xTimes: { entry: number; exit: number } | undefined,
  yTimes: { entry: number; exit: number } | undefined,
): { entry: number; exit: number } | undefined {
  if (!xTimes || !yTimes) {
    return undefined;
  }

  return {
    entry: Math.max(0, xTimes.entry, yTimes.entry),
    exit: Math.min(1, xTimes.exit, yTimes.exit),
  };
}

function contactTimeFromInterval(interval: { entry: number; exit: number } | undefined): number | undefined {
  if (!interval || interval.entry > interval.exit) {
    return undefined;
  }

  return interval.entry;
}

function vehicleCollisionContact(contact: VehicleContact): ProjectileCollisionContact & { time: number } {
  return {
    x: contact.x,
    y: contact.y,
    time: contact.time,
    directHitId: contact.id,
  };
}

function terrainCollisionContact(contact: ProjectileContact): ProjectileCollisionContact & { time: number } {
  return {
    x: contact.x,
    y: contact.y,
    time: contact.time,
  };
}

function earliestContact<T extends { time: number }>(contacts: readonly (T | undefined)[]): T | undefined {
  return contacts
    .filter((contact): contact is T => contact !== undefined)
    .sort((left, right) => left.time - right.time)[0];
}

function lerp(start: number, end: number, time: number): number {
  return start + (end - start) * time;
}
