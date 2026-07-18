import type { RoomSnapshot } from "../onlineLobbySnapshot";
import type { VehicleState } from "./MatchTypes";
import { applyOnlineMatchSnapshotToVehicles } from "./OnlineMatchStateSync";
import { OnlineVehicleSmoother } from "./OnlineVehicleSmoother";
import { OnlineTerrainSync, type OnlineTerrainSyncOptions } from "./OnlineTerrainSync";

export type MatchSceneOnlineVehicleSyncOptions = {
  localSessionId?: string;
  clientTimeMs: () => number;
  applyCrater?: OnlineTerrainSyncOptions["applyCrater"];
};

export class MatchSceneOnlineVehicleSync {
  private readonly smoother?: OnlineVehicleSmoother;
  private readonly terrainSync: OnlineTerrainSync;

  constructor(private readonly options: MatchSceneOnlineVehicleSyncOptions) {
    this.terrainSync = new OnlineTerrainSync({ applyCrater: options.applyCrater ?? (() => undefined) });
    this.smoother = options.localSessionId
      ? new OnlineVehicleSmoother({ localSessionId: options.localSessionId })
      : undefined;
  }

  applySnapshot(vehicles: VehicleState[], snapshot: RoomSnapshot): boolean {
    const terrainChanged = this.terrainSync.apply(snapshot);
    if (!this.smoother) {
      return applyOnlineMatchSnapshotToVehicles(vehicles, snapshot).changedVehicleIds.length > 0 || terrainChanged;
    }

    this.smoother.enqueueSnapshot(snapshot, this.options.clientTimeMs());
    return this.update(vehicles, 0) || terrainChanged;
  }

  update(vehicles: VehicleState[], deltaSeconds: number): boolean {
    if (!this.smoother) {
      return false;
    }

    return (
      this.smoother.update(vehicles, {
        clientTimeMs: this.options.clientTimeMs(),
        deltaSeconds,
      }).changedVehicleIds.length > 0
    );
  }
}
