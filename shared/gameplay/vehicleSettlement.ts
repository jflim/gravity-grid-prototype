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
}

const FOOTING_SAMPLE_COUNT = 7;
const MINIMUM_FOOTING_SUPPORT_RATIO = 2 / 3;
const FOOTING_SURFACE_TOLERANCE = 8;

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
      if (Math.abs(slope) < input.tuning.slopeThreshold) {
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
  const y = surface - input.tuning.vehicleHalfHeight;

  if (surface >= input.tuning.deathSurfaceY || !hasEnoughFootingSupport(input, x, surface)) {
    return {
      vehicleId: input.vehicle.id,
      x,
      y,
      hp: 0,
      alive: false,
      defeatReason: "void",
      adjustedForSlope,
      voidDropped: true,
      fallStartX,
      fallStartY,
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

function hasEnoughFootingSupport(input: VehicleSettlementInput, x: number, centerSurface: number): boolean {
  let supportedSamples = 0;

  for (let sample = 0; sample < FOOTING_SAMPLE_COUNT; sample += 1) {
    const t = sample / (FOOTING_SAMPLE_COUNT - 1);
    const sampleX = x - input.tuning.vehicleHalfWidth + t * input.tuning.vehicleHalfWidth * 2;
    const sampleSurface = input.surfaceAt(sampleX);

    if (surfaceSupportsFooting(input, sampleX, x, sampleSurface, centerSurface)) {
      supportedSamples += 1;
    }
  }

  return supportedSamples / FOOTING_SAMPLE_COUNT >= MINIMUM_FOOTING_SUPPORT_RATIO;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
