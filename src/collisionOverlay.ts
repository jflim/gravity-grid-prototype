export const COLLISION_ZONE_OVERLAY_DEPTH = 15;

export interface CollisionZoneOverlayStyle {
  fillColor: number;
  fillAlpha: number;
  lineColor: number;
  lineAlpha: number;
  lineWidth: number;
  crossColor: number;
  crossAlpha: number;
  crossWidth: number;
}

export function collisionZoneOverlayStyle(active: boolean, fillColor: number): CollisionZoneOverlayStyle {
  return {
    fillColor,
    fillAlpha: active ? 0.22 : 0.14,
    lineColor: fillColor,
    lineAlpha: active ? 0.92 : 0.72,
    lineWidth: active ? 4 : 3,
    crossColor: 0xffffff,
    crossAlpha: active ? 0.5 : 0.28,
    crossWidth: 2,
  };
}
