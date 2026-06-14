import type Phaser from "phaser";
import type { ProjectileKinematics } from "../../shared/gameplay/projectile.js";
import type { V1DemoUnitDefinition } from "../../shared/content/v1Units.js";
import type { CombatMarkerKind, DefeatReason, TeamId } from "../../shared/model/gameTypes.js";

export type VehicleState = V1DemoUnitDefinition & {
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
  trail: Phaser.Math.Vector2[];
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

export interface CombatMarker {
  kind: CombatMarkerKind;
  label: string;
  x: number;
  y: number;
  age: number;
  duration: number;
  lift: number;
  text: Phaser.GameObjects.Text;
}

export interface SettleOptions {
  changedX: number;
  changedRadius: number;
  forceIds?: Set<string>;
}
