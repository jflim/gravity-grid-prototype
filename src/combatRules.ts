export type TeamId = "red" | "blue";

interface WeaponEffectInput {
  shooterId?: string;
  shooterTeam?: TeamId;
  targetId: string;
  targetTeam: TeamId;
}

export function shouldApplyWeaponEffect(input: WeaponEffectInput): boolean {
  if (!input.shooterId || !input.shooterTeam) {
    return true;
  }

  if (input.targetId === input.shooterId) {
    return true;
  }

  return input.targetTeam !== input.shooterTeam;
}
