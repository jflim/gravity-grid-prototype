import assert from "node:assert/strict";
import test from "node:test";
import type { MatchSoundCue, MatchSoundEngine } from "./MatchSoundController.js";
import {
  createAssetSoundEngine,
  type MatchSoundAsset,
  type MatchSoundManifest,
  resolveMatchSoundAsset,
} from "./MatchSoundAssets.js";

class FakeFallbackEngine implements MatchSoundEngine {
  readonly cues: MatchSoundCue[] = [];

  play(cue: MatchSoundCue): void {
    this.cues.push(cue);
  }
}

class FakeAudioElement {
  volume = 1;
  playbackRate = 1;
  currentTime = 0;
  played = false;

  constructor(readonly src: string) {}

  play(): Promise<void> {
    this.played = true;
    return Promise.resolve();
  }
}

const asset = (src: string, options: Partial<MatchSoundAsset> = {}): MatchSoundAsset => ({
  src,
  ...options,
});

const manifest: MatchSoundManifest = {
  ui: {
    turnTick: asset("assets/sfx/ui/turn-tick.ogg"),
    turnTickUrgent: asset("assets/sfx/ui/turn-tick-urgent.ogg", { volume: 0.8 }),
  },
  movement: asset("assets/sfx/vehicle/move-pulse.ogg", { volume: 0.35 }),
  weaponFire: {
    default: asset("assets/sfx/weapons/default-fire.ogg"),
    byClassId: {
      bunger: asset("assets/sfx/weapons/nova-bunger-fire.ogg", { volume: 0.7 }),
    },
  },
  combat: {
    impact: asset("assets/sfx/combat/impact.ogg"),
    hit: asset("assets/sfx/combat/hit.ogg"),
    damageKo: asset("assets/sfx/combat/damage-ko.ogg"),
    voidDrop: asset("assets/sfx/combat/void-drop.ogg"),
  },
};

test("sound manifest resolves normal and urgent turn tick assets", () => {
  assert.equal(
    resolveMatchSoundAsset({ kind: "turn-tick", urgent: false }, manifest)?.src,
    "assets/sfx/ui/turn-tick.ogg",
  );
  assert.equal(
    resolveMatchSoundAsset({ kind: "turn-tick", urgent: true }, manifest)?.src,
    "assets/sfx/ui/turn-tick-urgent.ogg",
  );
});

test("sound manifest resolves class-specific weapon fire before default fire", () => {
  assert.equal(
    resolveMatchSoundAsset({ kind: "weapon-fire", classId: "bunger" }, manifest)?.src,
    "assets/sfx/weapons/nova-bunger-fire.ogg",
  );
  assert.equal(
    resolveMatchSoundAsset({ kind: "weapon-fire", classId: "unknown" }, manifest)?.src,
    "assets/sfx/weapons/default-fire.ogg",
  );
});

test("asset sound engine plays manifest audio with authored mix settings", () => {
  const fallback = new FakeFallbackEngine();
  const created: FakeAudioElement[] = [];
  const engine = createAssetSoundEngine({
    manifest,
    fallback,
    createAudio: (src) => {
      const audio = new FakeAudioElement(src);
      created.push(audio);
      return audio;
    },
  });

  engine.play({ kind: "weapon-fire", classId: "bunger" });

  assert.equal(created.length, 1);
  assert.equal(created[0]?.src, "assets/sfx/weapons/nova-bunger-fire.ogg");
  assert.equal(created[0]?.volume, 0.7);
  assert.equal(created[0]?.played, true);
  assert.deepEqual(fallback.cues, []);
});

test("asset sound engine falls back quietly when a cue has no asset", () => {
  const fallback = new FakeFallbackEngine();
  const engine = createAssetSoundEngine({
    manifest: { ui: {}, weaponFire: {}, combat: {} },
    fallback,
    createAudio: () => new FakeAudioElement("unused.ogg"),
  });

  engine.play({ kind: "impact" });

  assert.deepEqual(fallback.cues, [{ kind: "impact" }]);
});
