export interface TerrainPoint {
  x: number;
  y: number;
}

export type TerrainSegment = readonly TerrainPoint[];

export interface BuildTerrainHeightmapInput {
  worldWidth: number;
  voidSurfaceY: number;
  segments: readonly TerrainSegment[];
}

export interface TerrainSampleOptions {
  worldWidth?: number;
  voidSurfaceY: number;
}

export interface CraterTerrainInput {
  terrain: readonly number[];
  impactX: number;
  impactY: number;
  radius: number;
  depth: number;
  voidSurfaceY: number;
  breakthroughY?: number;
}

export interface TerrainAngleOptions extends TerrainSampleOptions {
  sampleDistance?: number;
}

export function buildTerrainHeightmap(input: BuildTerrainHeightmapInput): number[] {
  const terrain = new Array<number>(input.worldWidth + 1).fill(input.voidSurfaceY);

  for (const segment of input.segments) {
    for (let pointIndex = 1; pointIndex < segment.length; pointIndex += 1) {
      const start = segment[pointIndex - 1];
      const end = segment[pointIndex];
      const startX = Math.max(0, Math.round(start.x));
      const endX = Math.min(input.worldWidth, Math.round(end.x));
      const span = Math.max(1, end.x - start.x);

      for (let x = startX; x <= endX; x += 1) {
        const t = (x - start.x) / span;
        terrain[x] = start.y + (end.y - start.y) * t;
      }
    }
  }

  return terrain;
}

export function surfaceAt(terrain: readonly number[], x: number, options: TerrainSampleOptions): number {
  const worldWidth = options.worldWidth ?? terrain.length - 1;
  if (x < 0 || x > worldWidth) {
    return options.voidSurfaceY;
  }

  const index = clamp(Math.round(x), 0, worldWidth);
  return terrain[index] ?? options.voidSurfaceY;
}

export function craterTerrain(input: CraterTerrainInput): number[] {
  const radius = Math.max(0, input.radius);
  if (radius <= 0 || input.depth <= 0) {
    return [...input.terrain];
  }

  const terrain = [...input.terrain];
  const start = Math.max(0, Math.floor(input.impactX - radius));
  const end = Math.min(terrain.length - 1, Math.ceil(input.impactX + radius));
  const breakthroughY = input.breakthroughY ?? input.voidSurfaceY;

  for (let x = start; x <= end; x += 1) {
    const distance = Math.abs(x - input.impactX);
    if (distance >= radius) {
      continue;
    }

    const curve = Math.sqrt(1 - (distance / radius) ** 2);
    const carvedSurface = input.impactY + input.depth * curve;
    terrain[x] =
      carvedSurface >= breakthroughY
        ? input.voidSurfaceY
        : Math.min(input.voidSurfaceY, Math.max(terrain[x] ?? input.voidSurfaceY, carvedSurface));
  }

  return terrain;
}

export function terrainAngleAt(terrain: readonly number[], x: number, options: TerrainAngleOptions): number {
  const sampleDistance = options.sampleDistance ?? 1;
  const left = surfaceAt(terrain, x - sampleDistance, options);
  const right = surfaceAt(terrain, x + sampleDistance, options);
  return radiansToDegrees(Math.atan2(right - left, sampleDistance * 2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}
