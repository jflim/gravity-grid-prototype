import type { ProjectileKinematics } from "../../shared/gameplay/projectile.js";
import type { DemoUnitDefinition } from "../../shared/content/v1Units.js";
import type { DefeatReason, TeamId } from "../../shared/model/gameTypes.js";

export type VehicleState = DemoUnitDefinition & {
  x: number;
  y: number;
  hp: number;
  angle: number;
  facing: 1 | -1;
  moveUnits: number;
  alive: boolean;
  defeatReason?: DefeatReason;
  voidDropPresentation?: VoidDropPresentationState;
};

export interface ProjectileState extends ProjectileKinematics {
  shooterId: string;
  team: TeamId;
  trail: WorldPoint[];
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface ProjectileCollision {
  x: number;
  y: number;
  directHitId?: string;
}

export interface VoidDropPresentationState {
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  age: number;
  duration: number;
}

export interface ImpactPreview {
  x: number;
  y: number;
  craterRadius: number;
  damageRadius: number;
  isBungerShot: boolean;
  timeLeft: number;
}

export interface SettleOptions {
  changedX: number;
  changedRadius: number;
  forceIds?: Set<string>;
}
