export interface VehicleSettlementTuning {
  vehicleHalfWidth: number;
  vehicleHalfHeight: number;
  moveMinX: number;
  moveMaxX: number;
  deathSurfaceY: number;
  terrainChangePadding: number;
  slopeSampleDistance: number;
  slopeThreshold: number;
  slopeStep: number;
  maxSlopeIterations: number;
}

export interface VehicleSettlementVehicle {
  id: string;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
}

export type VehicleSettlementMotion =
  | {
      kind: "falling";
      velocityY: number;
    }
  | {
      kind: "sliding";
      direction: -1 | 1;
    };

export interface VehicleSettlementInput {
  vehicle: VehicleSettlementVehicle;
  tuning: VehicleSettlementTuning;
  fallbackFallStartY: number;
  adjustForSlope?: boolean;
  changedX?: number;
  changedRadius?: number;
  forceSettle?: boolean;
  surfaceAt: (x: number) => number;
}

export interface VehicleSettlementResult {
  vehicleId: string;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  defeatReason?: "void";
  adjustedForSlope: boolean;
  voidDropped: boolean;
  fallStartX: number;
  fallStartY: number;
  motion?: VehicleSettlementMotion;
}

const FOOTING_SAMPLE_COUNT = 7;
const MINIMUM_FOOTING_SUPPORT_RATIO = 2 / 3;
const FOOTING_SURFACE_TOLERANCE = 8;

interface FootingAnalysis {
  terrainSamples: number;
  stableSamples: number;
}

export function settleVehicleOnTerrain(input: VehicleSettlementInput): VehicleSettlementResult {
  if (!input.vehicle.alive) {
    return {
      vehicleId: input.vehicle.id,
      x: input.vehicle.x,
      y: input.vehicle.y,
      hp: input.vehicle.hp,
      alive: input.vehicle.alive,
      adjustedForSlope: false,
      voidDropped: false,
      fallStartX: input.vehicle.x,
      fallStartY: input.vehicle.y > 0 ? input.vehicle.y : input.fallbackFallStartY,
    };
  }

  let x = input.vehicle.x;
  let adjustedForSlope = false;

  if (shouldAdjustForSlope(input)) {
    for (let i = 0; i < input.tuning.maxSlopeIterations; i += 1) {
      const left = input.surfaceAt(x - input.tuning.slopeSampleDistance);
      const right = input.surfaceAt(x + input.tuning.slopeSampleDistance);
      const slope = right - left;
      if (!isSlopeTooSteep(slope, input.tuning.slopeThreshold)) {
        break;
      }

      const nextX = clamp(x + Math.sign(slope) * input.tuning.slopeStep, input.tuning.moveMinX, input.tuning.moveMaxX);
      adjustedForSlope = adjustedForSlope || nextX !== x;
      x = nextX;
    }
  }

  const fallStartX = x;
  const fallStartY = input.vehicle.y > 0 ? input.vehicle.y : input.fallbackFallStartY;
  const surface = input.surfaceAt(x);
  const footing = analyzeFooting(input, x, surface);

  if (surface >= input.tuning.deathSurfaceY || !hasEnoughTerrainUnderFooting(footing)) {
    return {
      vehicleId: input.vehicle.id,
      x,
      y: fallStartY,
      hp: input.vehicle.hp,
      alive: true,
      adjustedForSlope,
      voidDropped: false,
      fallStartX,
      fallStartY,
      motion: {
        kind: "falling",
        velocityY: 0,
      },
    };
  }

  const y = surface - input.tuning.vehicleHalfHeight;
  const slideDirection = hasEnoughStableFooting(footing)
    ? downhillDirectionForRest(input, x)
    : downhillDirectionForFootprint(input, x);
  if (slideDirection !== 0) {
    return {
      vehicleId: input.vehicle.id,
      x,
      y,
      hp: input.vehicle.hp,
      alive: true,
      adjustedForSlope,
      voidDropped: false,
      fallStartX,
      fallStartY,
      motion: {
        kind: "sliding",
        direction: slideDirection,
      },
    };
  }

  return {
    vehicleId: input.vehicle.id,
    x,
    y,
    hp: input.vehicle.hp,
    alive: true,
    adjustedForSlope,
    voidDropped: false,
    fallStartX,
    fallStartY,
  };
}

function downhillDirectionForRest(input: VehicleSettlementInput, x: number): -1 | 0 | 1 {
  const left = input.surfaceAt(x - input.tuning.slopeSampleDistance);
  const right = input.surfaceAt(x + input.tuning.slopeSampleDistance);
  const slope = right - left;
  if (!isSlopeTooSteep(slope, input.tuning.slopeThreshold)) {
    return 0;
  }

  return Math.sign(slope) as -1 | 1;
}

function downhillDirectionForFootprint(input: VehicleSettlementInput, x: number): -1 | 0 | 1 {
  const left = input.surfaceAt(x - input.tuning.vehicleHalfWidth);
  const right = input.surfaceAt(x + input.tuning.vehicleHalfWidth);
  const slope = right - left;
  if (isSlopeTooSteep(slope, input.tuning.slopeThreshold)) {
    return Math.sign(slope) as -1 | 1;
  }

  return downhillDirectionForRest(input, x);
}

function analyzeFooting(input: VehicleSettlementInput, x: number, centerSurface: number): FootingAnalysis {
  let terrainSamples = 0;
  let stableSamples = 0;

  for (let sample = 0; sample < FOOTING_SAMPLE_COUNT; sample += 1) {
    const t = sample / (FOOTING_SAMPLE_COUNT - 1);
    const sampleX = x - input.tuning.vehicleHalfWidth + t * input.tuning.vehicleHalfWidth * 2;
    const sampleSurface = input.surfaceAt(sampleX);

    if (sampleSurface < input.tuning.deathSurfaceY) {
      terrainSamples += 1;
    }

    if (surfaceSupportsFooting(input, sampleX, x, sampleSurface, centerSurface)) {
      stableSamples += 1;
    }
  }

  return {
    terrainSamples,
    stableSamples,
  };
}

function hasEnoughTerrainUnderFooting(footing: FootingAnalysis): boolean {
  return footing.terrainSamples / FOOTING_SAMPLE_COUNT >= MINIMUM_FOOTING_SUPPORT_RATIO;
}

function hasEnoughStableFooting(footing: FootingAnalysis): boolean {
  return footing.stableSamples / FOOTING_SAMPLE_COUNT >= MINIMUM_FOOTING_SUPPORT_RATIO;
}

function surfaceSupportsFooting(
  input: VehicleSettlementInput,
  sampleX: number,
  centerX: number,
  sampleSurface: number,
  centerSurface: number,
): boolean {
  if (sampleSurface >= input.tuning.deathSurfaceY) {
    return false;
  }

  const maxSlope =
    input.tuning.slopeThreshold / Math.max(input.tuning.slopeSampleDistance * 2, 1);
  const maxSupportedSurface =
    centerSurface + FOOTING_SURFACE_TOLERANCE + Math.abs(sampleX - centerX) * maxSlope;
  return sampleSurface <= maxSupportedSurface;
}

function shouldAdjustForSlope(input: VehicleSettlementInput): boolean {
  if (input.adjustForSlope === false) {
    return false;
  }

  if (input.forceSettle) {
    return true;
  }

  if (input.changedX === undefined || input.changedRadius === undefined) {
    return true;
  }

  return (
    Math.abs(input.vehicle.x - input.changedX) <=
    input.changedRadius + input.tuning.vehicleHalfWidth + input.tuning.terrainChangePadding
  );
}

function isSlopeTooSteep(slope: number, threshold: number): boolean {
  return Math.abs(slope) > threshold;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
