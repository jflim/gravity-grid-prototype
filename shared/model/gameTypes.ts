export const CHARACTER_IDS = ["nova", "vesper", "kaelii", "perlah"] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];
export type TeamId = "red" | "blue";
export type ClassId = "bunger" | "glitch" | "bouncer" | "spark";
export type CharacterPose = "default" | "ko" | "intense";
export type CombatMarkerKind = "direct" | "splash" | "shoved" | "ko" | "bunged";
export type DefeatReason = "damage" | "void";
export type Facing = 1 | -1;
export type VehicleId = "red-1" | "blue-1" | "red-2" | "blue-2";

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
