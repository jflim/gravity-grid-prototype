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

export class MatchInputController {
  constructor(private readonly input: MatchInputSnapshotInput) {}

  sample(): MatchInputSnapshot {
    return readMatchInputSnapshot(this.input);
  }
}

export function readMatchInputSnapshot(input: MatchInputSnapshotInput): MatchInputSnapshot {
  const justDown = input.justDown ?? (() => false);

  return {
    aimUp: input.cursors?.up?.isDown ?? false,
    aimDown: input.cursors?.down?.isDown ?? false,
    moveLeft: input.cursors?.left?.isDown ?? false,
    moveRight: input.cursors?.right?.isDown ?? false,
    chargeHeld: input.spaceKey?.isDown ?? false,
    resetPressed: input.resetKey ? justDown(input.resetKey) : false,
    collisionZonesTogglePressed: input.hullToggleKey ? justDown(input.hullToggleKey) : false,
    soundMuteTogglePressed: input.soundMuteKey ? justDown(input.soundMuteKey) : false,
  };
}
