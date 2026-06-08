export interface VehicleHitZone {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface VehicleHitZoneBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function vehicleHitZoneBounds(zone: VehicleHitZone): VehicleHitZoneBounds {
  return {
    left: zone.centerX - zone.width / 2,
    right: zone.centerX + zone.width / 2,
    top: zone.centerY - zone.height / 2,
    bottom: zone.centerY + zone.height / 2,
  };
}

export function pointInVehicleHitZone(x: number, y: number, zone: VehicleHitZone): boolean {
  const bounds = vehicleHitZoneBounds(zone);
  return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
}

export function closestPointOnVehicleHitZone(x: number, y: number, zone: VehicleHitZone): { x: number; y: number } {
  const bounds = vehicleHitZoneBounds(zone);
  return {
    x: clamp(x, bounds.left, bounds.right),
    y: clamp(y, bounds.top, bounds.bottom),
  };
}

export function distanceToVehicleHitZone(x: number, y: number, zone: VehicleHitZone): number {
  const closest = closestPointOnVehicleHitZone(x, y, zone);
  return Math.hypot(x - closest.x, y - closest.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
