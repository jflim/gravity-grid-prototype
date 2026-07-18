import type { RoomSnapshot, TerrainCraterSnapshot } from "../onlineLobbySnapshot";

export interface OnlineTerrainSyncOptions {
  applyCrater: (crater: TerrainCraterSnapshot) => void;
}

export class OnlineTerrainSync {
  private revision = 0;
  private craterCount = 0;

  constructor(private readonly options: OnlineTerrainSyncOptions) {}

  apply(snapshot: Pick<RoomSnapshot, "terrainRevision" | "terrainCraters">): boolean {
    if (snapshot.terrainRevision <= this.revision) return false;
    if (snapshot.terrainCraters.length < this.craterCount) this.craterCount = 0;

    const newCraters = snapshot.terrainCraters.slice(this.craterCount);
    for (const crater of newCraters) this.options.applyCrater(crater);

    this.revision = snapshot.terrainRevision;
    this.craterCount = snapshot.terrainCraters.length;
    return newCraters.length > 0;
  }
}
