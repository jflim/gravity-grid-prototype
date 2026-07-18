export interface KeyboardKeyLike {
  isDown: boolean;
}

export interface CursorKeysLike {
  up?: KeyboardKeyLike;
  down?: KeyboardKeyLike;
  left?: KeyboardKeyLike;
  right?: KeyboardKeyLike;
}

export interface MatchInputSnapshot {
  aimUp: boolean;
  aimDown: boolean;
  moveLeft: boolean;
  moveRight: boolean;
  chargeHeld: boolean;
  resetPressed: boolean;
  collisionZonesTogglePressed: boolean;
  soundMuteTogglePressed: boolean;
}

export interface MatchInputSnapshotInput {
  cursors?: CursorKeysLike;
  spaceKey?: KeyboardKeyLike;
  resetKey?: KeyboardKeyLike;
  hullToggleKey?: KeyboardKeyLike;
  soundMuteKey?: KeyboardKeyLike;
  justDown?: (key: KeyboardKeyLike) => boolean;
}

export const EMPTY_MATCH_INPUT: MatchInputSnapshot = {
  aimUp: false,
  aimDown: false,
  moveLeft: false,
  moveRight: false,
  chargeHeld: false,
  resetPressed: false,
  collisionZonesTogglePressed: false,
  soundMuteTogglePressed: false,
};
const EMPTY_CURSOR_KEYS: CursorKeysLike = {};

export class MatchInputController {
  constructor(private readonly input: MatchInputSnapshotInput) {}

  sample(): MatchInputSnapshot {
    return readMatchInputSnapshot(this.input);
  }
}

export function readMatchInputSnapshot(input: MatchInputSnapshotInput): MatchInputSnapshot {
  const cursors = input.cursors ?? EMPTY_CURSOR_KEYS;
  return {
    ...readAimInput(cursors),
    ...readMoveInput(cursors),
    chargeHeld: keyIsDown(input.spaceKey),
    ...readCommandInput(input),
  };
}

function readAimInput(cursors: CursorKeysLike): Pick<MatchInputSnapshot, "aimUp" | "aimDown"> {
  return {
    aimUp: keyIsDown(cursors.up),
    aimDown: keyIsDown(cursors.down),
  };
}

function readMoveInput(cursors: CursorKeysLike): Pick<MatchInputSnapshot, "moveLeft" | "moveRight"> {
  return {
    moveLeft: keyIsDown(cursors.left),
    moveRight: keyIsDown(cursors.right),
  };
}

function readCommandInput(input: MatchInputSnapshotInput): Pick<
  MatchInputSnapshot,
  "resetPressed" | "collisionZonesTogglePressed" | "soundMuteTogglePressed"
> {
  const justDown = input.justDown ?? (() => false);
  return {
    resetPressed: keyWasPressed(input.resetKey, justDown),
    collisionZonesTogglePressed: keyWasPressed(input.hullToggleKey, justDown),
    soundMuteTogglePressed: keyWasPressed(input.soundMuteKey, justDown),
  };
}

function keyIsDown(key?: KeyboardKeyLike): boolean {
  return key?.isDown ?? false;
}

function keyWasPressed(
  key: KeyboardKeyLike | undefined,
  justDown: (key: KeyboardKeyLike) => boolean,
): boolean {
  return key ? justDown(key) : false;
}
