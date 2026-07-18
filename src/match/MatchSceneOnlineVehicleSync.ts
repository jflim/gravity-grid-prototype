import type { RoomSnapshot } from "../onlineLobbySnapshot";
import type { VehicleState } from "./MatchTypes";
import { applyOnlineMatchSnapshotToVehicles } from "./OnlineMatchStateSync";
import { OnlineVehicleSmoother } from "./OnlineVehicleSmoother";

export type MatchSceneOnlineVehicleSyncOptions = {
  localSessionId?: string;
  clientTimeMs: () => number;
};

export class MatchSceneOnlineVehicleSync {
  private readonly smoother?: OnlineVehicleSmoother;

  constructor(private readonly options: MatchSceneOnlineVehicleSyncOptions) {
    this.smoother = options.localSessionId
      ? new OnlineVehicleSmoother({ localSessionId: options.localSessionId })
      : undefined;
  }

  applySnapshot(vehicles: VehicleState[], snapshot: RoomSnapshot): boolean {
    if (!this.smoother) {
      return applyOnlineMatchSnapshotToVehicles(vehicles, snapshot).changedVehicleIds.length > 0;
    }

    this.smoother.enqueueSnapshot(snapshot, this.options.clientTimeMs());
    return this.update(vehicles, 0);
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
