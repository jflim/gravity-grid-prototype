import {
  closestPointOnVehicleHitZone,
  vehicleHitZoneBounds,
  type VehicleHitZone,
} from "./vehicleHitZone";

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

    let low = previousTime;
    let high = time;
    for (let refine = 0; refine < 12; refine += 1) {
      const mid = (low + high) / 2;
      if (terrainOverlapsProjectileAt(input, mid)) {
        high = mid;
      } else {
        low = mid;
      }
    }

    const x = lerp(input.startX, input.endX, high);
    return {
      x,
      y: input.surfaceAt(x),
      time: high,
    };
  }

  return undefined;
}

export function firstVehicleContact(input: VehicleContactInput): VehicleContact | undefined {
  let best: VehicleContact | undefined;

  for (const zone of input.zones) {
    const time = sweptAabbContactTime(input, zone);
    if (time === undefined || (best && time >= best.time)) {
      continue;
    }

    const centerX = lerp(input.startX, input.endX, time);
    const centerY = lerp(input.startY, input.endY, time);
    const contact = closestPointOnVehicleHitZone(centerX, centerY, zone);
    best = {
      id: zone.id,
      x: contact.x,
      y: contact.y,
      time,
    };
  }

  return best;
}

function terrainOverlapsProjectileAt(input: TerrainContactInput, time: number): boolean {
  const x = lerp(input.startX, input.endX, time);
  if (x < 0 || x > input.worldWidth) {
    return false;
  }

  const y = lerp(input.startY, input.endY, time);
  return y + input.projectileRadius >= input.surfaceAt(x);
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
  let entry = 0;
  let exit = 1;

  const xTimes = axisTimes(input.startX, dx, expanded.left, expanded.right);
  if (!xTimes) {
    return undefined;
  }
  entry = Math.max(entry, xTimes.entry);
  exit = Math.min(exit, xTimes.exit);

  const yTimes = axisTimes(input.startY, dy, expanded.top, expanded.bottom);
  if (!yTimes) {
    return undefined;
  }
  entry = Math.max(entry, yTimes.entry);
  exit = Math.min(exit, yTimes.exit);

  return entry <= exit && entry <= 1 && exit >= 0 ? Math.max(0, entry) : undefined;
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

function lerp(start: number, end: number, time: number): number {
  return start + (end - start) * time;
}
