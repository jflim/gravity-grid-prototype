export interface SpriteDisplaySize {
  width: number;
  height: number;
}

export interface CombatHullShape {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

export type DefeatReason = "damage" | "void";

export interface DefeatPresentation {
  label: "KO" | "VOID DROPPED";
  alpha: number;
  tint?: number;
  y?: number;
}

export const BATTLEFIELD_UNIT_SCALE = 0.68;
export const VOID_DROP_DISPLAY_Y = 828;

export function scaleBattlefieldDisplay(display: SpriteDisplaySize): SpriteDisplaySize {
  return {
    width: Math.round(display.width * BATTLEFIELD_UNIT_SCALE),
    height: Math.round(display.height * BATTLEFIELD_UNIT_SCALE),
  };
}

export function scaleBattlefieldCombatHull(hull: CombatHullShape): CombatHullShape {
  return {
    offsetX: scaleBattlefieldOffset(hull.offsetX),
    offsetY: scaleBattlefieldOffset(hull.offsetY),
    width: scaleBattlefieldOffset(hull.width),
    height: scaleBattlefieldOffset(hull.height),
  };
}

export function scaleBattlefieldOffset(value: number): number {
  return Math.round(value * BATTLEFIELD_UNIT_SCALE);
}

export function defeatPresentationFor(reason: DefeatReason | undefined): DefeatPresentation {
  if (reason === "void") {
    return {
      label: "VOID DROPPED",
      alpha: 0.56,
      tint: 0x8be9ff,
      y: VOID_DROP_DISPLAY_Y,
    };
  }

  return {
    label: "KO",
    alpha: 0.9,
  };
}
