import type { CombatVehicleSnapshot, RoomSnapshot } from "../onlineLobbySnapshot";
import type { VehicleState } from "./MatchTypes";
import { finiteNumber, serverFacing, serverVehicleId } from "./OnlineSnapshotFields";

export type OnlineVehicleSmootherOptions = {
  localSessionId: string;
  interpolationDelayMs?: number;
  localCorrectionPerSecond?: number;
  localSnapDistance?: number;
};

export type OnlineVehicleSmootherUpdateInput = {
  clientTimeMs: number;
  deltaSeconds: number;
};

export type OnlineVehicleSmootherUpdateResult = {
  changedVehicleIds: string[];
  localCorrectionCount: number;
  maxLocalCorrectionDistance: number;
};

type VehicleSample = {
  serverTimeMs: number;
  x: number;
  y: number;
  facing: 1 | -1;
  angle: number;
};

const DEFAULT_INTERPOLATION_DELAY_MS = 60;
const DEFAULT_LOCAL_SNAP_DISTANCE = 96;
const MAX_SAMPLES_PER_VEHICLE = 8;

export class OnlineVehicleSmoother {
  private readonly interpolationDelayMs: number;
  private readonly localSnapDistance: number;
  private readonly samplesByVehicleId = new Map<string, VehicleSample[]>();
  private readonly latestServerVehicleById = new Map<string, CombatVehicleSnapshot>();
  private latestTiming?: { serverTimeMs: number; clientTimeMs: number };

  constructor(private readonly options: OnlineVehicleSmootherOptions) {
    this.interpolationDelayMs = options.interpolationDelayMs ?? DEFAULT_INTERPOLATION_DELAY_MS;
    this.localSnapDistance = options.localSnapDistance ?? DEFAULT_LOCAL_SNAP_DISTANCE;
  }

  enqueueSnapshot(snapshot: RoomSnapshot, clientTimeMs: number): void {
    this.latestTiming = { serverTimeMs: snapshot.serverTimeMs, clientTimeMs };
    for (const serverVehicle of snapshot.vehicles) {
      const vehicleId = serverVehicleId(serverVehicle);
      this.latestServerVehicleById.set(vehicleId, serverVehicle);
      if (!this.isLocalVehicle(serverVehicle)) {
        this.enqueueRemoteSample(vehicleId, serverVehicle, snapshot.serverTimeMs);
      }
    }
  }

  update(
    vehicles: VehicleState[],
    input: OnlineVehicleSmootherUpdateInput,
  ): OnlineVehicleSmootherUpdateResult {
    const result: OnlineVehicleSmootherUpdateResult = {
      changedVehicleIds: [],
      localCorrectionCount: 0,
      maxLocalCorrectionDistance: 0,
    };
    const renderServerTimeMs = this.renderServerTimeMs(input.clientTimeMs);

    for (const vehicle of vehicles) {
      this.updateVehicle(vehicle, renderServerTimeMs, result);
    }

    return result;
  }

  private updateVehicle(
    vehicle: VehicleState,
    renderServerTimeMs: number,
    result: OnlineVehicleSmootherUpdateResult,
  ): void {
    const serverVehicle = this.latestServerVehicleById.get(vehicle.id);
    if (!serverVehicle) {
      return;
    }

    if (this.applyServerVehicleTruth(vehicle, serverVehicle, renderServerTimeMs, result)) {
      result.changedVehicleIds.push(vehicle.id);
    }
  }

  private applyServerVehicleTruth(
    vehicle: VehicleState,
    serverVehicle: CombatVehicleSnapshot,
    renderServerTimeMs: number,
    result: OnlineVehicleSmootherUpdateResult,
  ): boolean {
    return this.isLocalVehicle(serverVehicle)
      ? this.applyLocalVehicleTruth(vehicle, serverVehicle, result)
      : this.applyRemoteVehicleTruth(vehicle, serverVehicle, renderServerTimeMs);
  }

  private enqueueRemoteSample(
    vehicleId: string,
    serverVehicle: CombatVehicleSnapshot,
    serverTimeMs: number,
  ): void {
    const samples = this.samplesByVehicleId.get(vehicleId) ?? [];
    samples.push({
      serverTimeMs,
      x: finiteNumber(serverVehicle.x, 0),
      y: finiteNumber(serverVehicle.y, 0),
      facing: serverFacing(serverVehicle.facing),
      angle: finiteNumber(serverVehicle.angle, 0),
    });
    this.samplesByVehicleId.set(vehicleId, samples.slice(-MAX_SAMPLES_PER_VEHICLE));
  }

  private renderServerTimeMs(clientTimeMs: number): number {
    if (!this.latestTiming) {
      return 0;
    }

    return this.latestTiming.serverTimeMs + (clientTimeMs - this.latestTiming.clientTimeMs) - this.interpolationDelayMs;
  }

  private applyRemoteVehicleTruth(
    vehicle: VehicleState,
    serverVehicle: CombatVehicleSnapshot,
    renderServerTimeMs: number,
  ): boolean {
    const sample = this.interpolatedSample(vehicle.id, renderServerTimeMs);
    const next = sample ?? sampleFromServerVehicle(serverVehicle);
    const changed = [
      applyNumberField(vehicle, "x", next.x),
      applyNumberField(vehicle, "y", next.y),
      applyNumberField(vehicle, "angle", next.angle),
      applyFacing(vehicle, next.facing),
    ].some(Boolean);

    return applySharedTruth(vehicle, serverVehicle) || changed;
  }

  private applyLocalVehicleTruth(
    vehicle: VehicleState,
    serverVehicle: CombatVehicleSnapshot,
    result: OnlineVehicleSmootherUpdateResult,
  ): boolean {
    const correction = correctionDistance(vehicle, serverVehicle);
    const sharedChanged = applySharedTruth(vehicle, serverVehicle);
    if (correction <= 0) {
      return sharedChanged;
    }

    result.localCorrectionCount += 1;
    result.maxLocalCorrectionDistance = Math.max(result.maxLocalCorrectionDistance, correction);
    if (correction >= this.localSnapDistance) {
      return [
        applyNumberField(vehicle, "x", serverVehicle.x),
        applyNumberField(vehicle, "y", serverVehicle.y),
        sharedChanged,
      ].some(Boolean);
    }

    return sharedChanged;
  }

  private interpolatedSample(vehicleId: string, renderServerTimeMs: number): VehicleSample | undefined {
    return sampleAtServerTime(this.samplesByVehicleId.get(vehicleId) ?? [], renderServerTimeMs);
  }

  private isLocalVehicle(serverVehicle: CombatVehicleSnapshot): boolean {
    return serverVehicle.ownerSessionId === this.options.localSessionId;
  }
}

function sampleAtServerTime(samples: VehicleSample[], renderServerTimeMs: number): VehicleSample | undefined {
  if (samples.length === 0) {
    return undefined;
  }

  const afterIndex = samples.findIndex((sample) => sample.serverTimeMs >= renderServerTimeMs);
  return sampleAtIndex(samples, renderServerTimeMs, afterIndex);
}

function sampleAtIndex(
  samples: VehicleSample[],
  renderServerTimeMs: number,
  afterIndex: number,
): VehicleSample | undefined {
  if (afterIndex < 0) {
    return samples[samples.length - 1];
  }

  const after = samples[afterIndex] ?? samples[samples.length - 1];
  const before = samples[afterIndex - 1];
  return before ? interpolateSample(before, after, renderServerTimeMs) : after;
}

function interpolateSample(before: VehicleSample, after: VehicleSample, renderServerTimeMs: number): VehicleSample {
  const spanMs = Math.max(1, after.serverTimeMs - before.serverTimeMs);
  const alpha = Math.max(0, Math.min(1, (renderServerTimeMs - before.serverTimeMs) / spanMs));
  return {
    serverTimeMs: renderServerTimeMs,
    x: lerp(before.x, after.x, alpha),
    y: lerp(before.y, after.y, alpha),
    facing: alpha < 0.5 ? before.facing : after.facing,
    angle: lerp(before.angle, after.angle, alpha),
  };
}

function applySharedTruth(vehicle: VehicleState, serverVehicle: CombatVehicleSnapshot): boolean {
  return [
    applyNumberField(vehicle, "hp", serverVehicle.hp),
    applyBooleanField(vehicle, "alive", serverVehicle.alive),
    applyNumberField(vehicle, "moveUnits", serverVehicle.moveUnits),
  ].some(Boolean);
}

function applyNumberField(
  vehicle: VehicleState,
  field: "x" | "y" | "angle" | "hp" | "moveUnits",
  value: number,
): boolean {
  const next = finiteNumber(value, vehicle[field]);
  if (vehicle[field] === next) {
    return false;
  }

  vehicle[field] = next;
  return true;
}

function applyBooleanField(vehicle: VehicleState, field: "alive", value: boolean): boolean {
  if (vehicle[field] === value) {
    return false;
  }

  vehicle[field] = value;
  return true;
}

function applyFacing(vehicle: VehicleState, facing: 1 | -1): boolean {
  if (vehicle.facing === facing) {
    return false;
  }

  vehicle.facing = facing;
  return true;
}

function sampleFromServerVehicle(serverVehicle: CombatVehicleSnapshot): VehicleSample {
  return {
    serverTimeMs: 0,
    x: finiteNumber(serverVehicle.x, 0),
    y: finiteNumber(serverVehicle.y, 0),
    facing: serverFacing(serverVehicle.facing),
    angle: finiteNumber(serverVehicle.angle, 0),
  };
}

function correctionDistance(vehicle: VehicleState, serverVehicle: CombatVehicleSnapshot): number {
  return Math.hypot(vehicle.x - finiteNumber(serverVehicle.x, vehicle.x), vehicle.y - finiteNumber(serverVehicle.y, vehicle.y));
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}
