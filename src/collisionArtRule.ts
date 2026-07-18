import type { CombatHullShape, SpriteDisplaySize } from "./combatPresentation";

export type PilotPose = "seated" | "crouched" | "standing";
export type ProtectionCue = "cockpit" | "guard-rail" | "roll-cage" | "armored-platform" | "harness";

export interface CollisionArtRuleInput {
  unitId: string;
  display: SpriteDisplaySize;
  hitZone: CombatHullShape;
  pilotPose: PilotPose;
  protectionCue?: ProtectionCue;
  notes: string;
}

export interface CollisionArtRuleResult {
  pass: boolean;
  reasons: string[];
}

const MAX_DISPLAY_TO_HIT_ZONE_WIDTH = 1.6;
const MAX_DISPLAY_TO_HIT_ZONE_HEIGHT = 3.1;

export function evaluateCollisionArtRule(input: CollisionArtRuleInput): CollisionArtRuleResult {
  const reasons: string[] = [];
  const widthRatio = input.display.width / input.hitZone.width;
  const heightRatio = input.display.height / input.hitZone.height;

  if (widthRatio > MAX_DISPLAY_TO_HIT_ZONE_WIDTH || heightRatio > MAX_DISPLAY_TO_HIT_ZONE_HEIGHT) {
    reasons.push(
      `unit art is too large for the shared vehicle hit zone (${widthRatio.toFixed(2)}x wide, ${heightRatio.toFixed(2)}x tall)`,
    );
  }

  if (input.pilotPose !== "seated" && !input.protectionCue) {
    reasons.push("non-seated pilot art needs an explicit vehicle protection cue");
  }

  if (input.notes.trim().length < 12) {
    reasons.push("collision art review needs a useful note");
  }

  return {
    pass: reasons.length === 0,
    reasons,
  };
}
