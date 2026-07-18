import type { SpriteDisplaySize } from "./combatPresentation";

interface VoidDropDisplayInput {
  startX: number;
  worldWidth: number;
  step: number;
  displayWidth: number;
  padding: number;
  isVoidAt: (x: number) => boolean;
}

interface VoidRun {
  start: number;
  end: number;
}

interface VoidDropRenderInput {
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  age: number;
  duration: number;
}

interface VisibleVoidZoneTopInput {
  terrain: number[];
  terrainBreakthroughY: number;
  fallbackTopY: number;
}

interface VoidDropTargetInput {
  visibleVoidTopY: number;
  visibleVoidZoneHeight: number;
  displayHeight: number;
  padding?: number;
}

export const DRAMATIC_VOID_DROP_FALL_SECONDS = 1.55;

export function chooseVoidDropDisplayX(input: VoidDropDisplayInput): number {
  const runs = collectVoidRuns(input);
  const halfWidth = input.displayWidth / 2 + input.padding;
  let bestX = clamp(input.startX, 0, input.worldWidth);
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const run of runs) {
    const minX = run.start + halfWidth;
    const maxX = run.end - halfWidth;
    if (minX > maxX) {
      continue;
    }

    const candidateX = clamp(input.startX, minX, maxX);
    const distance = Math.abs(candidateX - input.startX);
    if (distance < bestDistance) {
      bestX = candidateX;
      bestDistance = distance;
    }
  }

  return bestX;
}

export function requiredVoidZoneHeight(display: SpriteDisplaySize): number {
  return Math.max(240, Math.ceil(display.height * 1.5));
}

export function visibleVoidZoneTopY(input: VisibleVoidZoneTopInput): number {
  const playableSurfaces = input.terrain.filter(
    (surface) => Number.isFinite(surface) && surface < input.terrainBreakthroughY,
  );
  if (playableSurfaces.length === 0) {
    return input.fallbackTopY;
  }

  return Math.max(...playableSurfaces);
}

export function visibleVoidZoneBottomY(visibleVoidTopY: number, visibleVoidZoneHeight: number): number {
  return visibleVoidTopY + visibleVoidZoneHeight;
}

export function voidDropTargetY(input: VoidDropTargetInput): number {
  const padding = input.padding ?? 10;
  return Math.round(
    input.visibleVoidTopY + input.visibleVoidZoneHeight - input.displayHeight / 2 - padding,
  );
}

export function voidDropRenderPosition(input: VoidDropRenderInput): { x: number; y: number } {
  const progress = clamp(input.age / input.duration, 0, 1);
  const eased = progress * progress;
  return {
    x: lerp(input.fromX, input.targetX, eased),
    y: lerp(input.fromY, input.targetY, eased),
  };
}

function collectVoidRuns(input: VoidDropDisplayInput): VoidRun[] {
  const runs: VoidRun[] = [];
  let runStart: number | undefined;

  for (let x = 0; x <= input.worldWidth + input.step; x += input.step) {
    const sampleX = Math.min(x, input.worldWidth);
    const isVoid = input.isVoidAt(sampleX);
    if (isVoid && runStart === undefined) {
      runStart = sampleX;
    }

    if ((!isVoid || x > input.worldWidth) && runStart !== undefined) {
      runs.push({ start: runStart, end: sampleX - input.step });
      runStart = undefined;
    }
  }

  return runs;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, time: number): number {
  return start + (end - start) * time;
}
