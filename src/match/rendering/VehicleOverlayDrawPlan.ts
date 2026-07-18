import type { VehicleRenderModel } from "./VehicleRenderModel";

export type VehicleOverlayDrawKey = "combatHull" | "hpBar";

type VehicleOverlayDrawFlags = Pick<VehicleRenderModel, "showCombatHull" | "showHpBar">;

export function vehicleOverlayDrawKeysFor(model: VehicleOverlayDrawFlags): VehicleOverlayDrawKey[] {
  const keys: VehicleOverlayDrawKey[] = [];
  appendVisibleKey(keys, model.showCombatHull, "combatHull");
  appendVisibleKey(keys, model.showHpBar, "hpBar");
  return keys;
}

function appendVisibleKey(
  keys: VehicleOverlayDrawKey[],
  visible: boolean,
  key: VehicleOverlayDrawKey,
): void {
  if (!visible) {
    return;
  }

  keys.push(key);
}
