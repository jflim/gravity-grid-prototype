import assert from "node:assert/strict";
import test from "node:test";
import {
  MatchSoundController,
  type MatchSoundCue,
  type MatchSoundEngine,
} from "./MatchSoundController.js";

class FakeSoundEngine implements MatchSoundEngine {
  readonly cues: MatchSoundCue[] = [];

  play(cue: MatchSoundCue): void {
    this.cues.push(cue);
  }
}

test("match sound controller ticks once per displayed turn second", () => {
  const engine = new FakeSoundEngine();
  const sounds = new MatchSoundController({ engine });

  sounds.beginTurn("nova", 20);
  sounds.updateTurnTick({ activeVehicleId: "nova", turnTime: 19.9, canAct: true });
  sounds.updateTurnTick({ activeVehicleId: "nova", turnTime: 18.9, canAct: true });
  sounds.updateTurnTick({ activeVehicleId: "nova", turnTime: 17.9, canAct: true });

  assert.deepEqual(engine.cues, [
    { kind: "turn-tick", urgent: false },
    { kind: "turn-tick", urgent: false },
  ]);
});

test("match sound controller uses urgent ticks for the final five displayed seconds", () => {
  const engine = new FakeSoundEngine();
  const sounds = new MatchSoundController({ engine });

  sounds.beginTurn("vesper", 6);
  sounds.updateTurnTick({ activeVehicleId: "vesper", turnTime: 4.9, canAct: true });

  assert.deepEqual(engine.cues, [{ kind: "turn-tick", urgent: true }]);
});

test("match sound controller resets second tracking when active turn changes", () => {
  const engine = new FakeSoundEngine();
  const sounds = new MatchSoundController({ engine });

  sounds.beginTurn("nova", 20);
  sounds.updateTurnTick({ activeVehicleId: "nova", turnTime: 18.9, canAct: true });
  sounds.updateTurnTick({ activeVehicleId: "kaelii", turnTime: 20, canAct: true });

  assert.deepEqual(engine.cues, [{ kind: "turn-tick", urgent: false }]);
});

test("match sound controller pulses movement while a vehicle is actively moving", () => {
  const engine = new FakeSoundEngine();
  const sounds = new MatchSoundController({ engine });

  sounds.updateMovement({ moving: true, deltaSeconds: 0.01 });
  sounds.updateMovement({ moving: true, deltaSeconds: 0.05 });
  sounds.updateMovement({ moving: true, deltaSeconds: 0.07 });
  sounds.updateMovement({ moving: false, deltaSeconds: 1 });
  sounds.updateMovement({ moving: true, deltaSeconds: 0.01 });

  assert.deepEqual(engine.cues, [
    { kind: "movement" },
    { kind: "movement" },
    { kind: "movement" },
  ]);
});

test("match sound controller plays approved combat feedback cues", () => {
  const engine = new FakeSoundEngine();
  const sounds = new MatchSoundController({ engine });

  sounds.playWeaponFire("bunger");
  sounds.playImpact();
  sounds.playHit();
  sounds.playDamageKo();
  sounds.playVoidDrop();

  assert.deepEqual(engine.cues, [
    { kind: "weapon-fire", classId: "bunger" },
    { kind: "impact" },
    { kind: "hit" },
    { kind: "damage-ko" },
    { kind: "void-drop" },
  ]);
});

test("match sound controller mute toggle blocks cue playback", () => {
  const engine = new FakeSoundEngine();
  const sounds = new MatchSoundController({ engine });

  assert.equal(sounds.toggleMuted(), true);
  sounds.playImpact();
  sounds.updateMovement({ moving: true, deltaSeconds: 0.2 });
  sounds.beginTurn("nova", 20);
  sounds.updateTurnTick({ activeVehicleId: "nova", turnTime: 18.9, canAct: true });

  assert.deepEqual(engine.cues, []);

  assert.equal(sounds.toggleMuted(), false);
  sounds.playImpact();

  assert.deepEqual(engine.cues, [{ kind: "impact" }]);
});
