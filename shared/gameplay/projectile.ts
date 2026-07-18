export interface ProjectileKinematics {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface LaunchProjectileInput {
  shooterX: number;
  shooterY: number;
  angleDeg: number;
  power: number;
  maxPower: number;
  shotSpeedMin: number;
  shotSpeedMax: number;
  muzzleDistance: number;
  muzzleYOffset: number;
}

export interface StepProjectileInput {
  projectile: ProjectileKinematics;
  deltaSeconds: number;
  wind: number;
  windForce: number;
  gravity: number;
}

export interface ProjectileStepResult {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  projectile: ProjectileKinematics;
}

export interface ProjectileBounds {
  worldWidth: number;
  worldHeight: number;
  lowerYMargin: number;
  upperYMargin: number;
}

export function launchProjectile(input: LaunchProjectileInput): ProjectileKinematics {
  const radians = degreesToRadians(input.angleDeg);
  const powerRatio = input.power / input.maxPower;
  const speed = lerp(input.shotSpeedMin, input.shotSpeedMax, powerRatio);
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: input.shooterX + cos * input.muzzleDistance,
    y: input.shooterY + input.muzzleYOffset - sin * input.muzzleDistance,
    vx: cos * speed,
    vy: -sin * speed,
  };
}

export function stepProjectile(input: StepProjectileInput): ProjectileStepResult {
  const startX = input.projectile.x;
  const startY = input.projectile.y;
  const vx = input.projectile.vx + input.wind * input.windForce * input.deltaSeconds;
  const vy = input.projectile.vy + input.gravity * input.deltaSeconds;
  const endX = startX + vx * input.deltaSeconds;
  const endY = startY + vy * input.deltaSeconds;

  return {
    startX,
    startY,
    endX,
    endY,
    projectile: {
      x: endX,
      y: endY,
      vx,
      vy,
    },
  };
}

export function isProjectileOutOfBounds(
  projectile: Pick<ProjectileKinematics, "x" | "y">,
  bounds: ProjectileBounds,
): boolean {
  return (
    projectile.x < 0 ||
    projectile.x > bounds.worldWidth ||
    projectile.y > bounds.worldHeight + bounds.lowerYMargin ||
    projectile.y < -bounds.upperYMargin
  );
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}
