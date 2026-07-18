import type { MatchSoundCue, MatchSoundEngine } from "./MatchSoundController.js";

export interface MatchSoundAsset {
  src: string;
  volume?: number;
  playbackRate?: number;
}

export interface MatchSoundManifest {
  ui: {
    turnTick?: MatchSoundAsset;
    turnTickUrgent?: MatchSoundAsset;
  };
  movement?: MatchSoundAsset;
  weaponFire: {
    default?: MatchSoundAsset;
    byClassId?: Record<string, MatchSoundAsset>;
  };
  combat: {
    impact?: MatchSoundAsset;
    hit?: MatchSoundAsset;
    damageKo?: MatchSoundAsset;
    voidDrop?: MatchSoundAsset;
  };
}

export interface BrowserAudioLike {
  volume: number;
  playbackRate: number;
  currentTime: number;
  play(): Promise<void> | void;
}

export interface BrowserAudioSource {
  Audio?: new (src?: string) => BrowserAudioLike;
}

export interface AssetSoundEngineOptions {
  manifest: MatchSoundManifest;
  fallback?: MatchSoundEngine;
  createAudio?: (src: string) => BrowserAudioLike;
}

// Add short authored SFX paths here to override the procedural fallback.
// Paths are relative to the Vite public root, for example: assets/sfx/ui/turn-tick.ogg.
export const MATCH_SOUND_MANIFEST: MatchSoundManifest = {
  ui: {},
  weaponFire: {
    byClassId: {},
  },
  combat: {},
};

export function resolveMatchSoundAsset(
  cue: MatchSoundCue,
  manifest: MatchSoundManifest,
): MatchSoundAsset | undefined {
  switch (cue.kind) {
    case "turn-tick":
      return cue.urgent
        ? manifest.ui.turnTickUrgent ?? manifest.ui.turnTick
        : manifest.ui.turnTick;
    case "movement":
      return manifest.movement;
    case "weapon-fire":
      return manifest.weaponFire.byClassId?.[cue.classId] ?? manifest.weaponFire.default;
    case "impact":
      return manifest.combat.impact;
    case "hit":
      return manifest.combat.hit;
    case "damage-ko":
      return manifest.combat.damageKo;
    case "void-drop":
      return manifest.combat.voidDrop;
  }
}

export function createAssetSoundEngine(options: AssetSoundEngineOptions): MatchSoundEngine {
  return new AssetSoundEngine(options);
}

export function createBrowserAudioFactory(
  source: BrowserAudioSource = globalThis as BrowserAudioSource,
): ((src: string) => BrowserAudioLike) | undefined {
  if (!source.Audio) {
    return undefined;
  }

  return (src) => new source.Audio!(src);
}

class AssetSoundEngine implements MatchSoundEngine {
  constructor(private readonly options: AssetSoundEngineOptions) {}

  play(cue: MatchSoundCue): void {
    const asset = resolveMatchSoundAsset(cue, this.options.manifest);
    if (!asset || !this.options.createAudio) {
      this.options.fallback?.play(cue);
      return;
    }

    let audio: BrowserAudioLike;
    try {
      audio = this.options.createAudio(asset.src);
    } catch {
      this.options.fallback?.play(cue);
      return;
    }

    audio.volume = clamp(asset.volume ?? 1, 0, 1);
    audio.playbackRate = Math.max(0.01, asset.playbackRate ?? 1);
    audio.currentTime = 0;

    try {
      const result = audio.play();
      if (result instanceof Promise) {
        result.catch(() => this.options.fallback?.play(cue));
      }
    } catch {
      this.options.fallback?.play(cue);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
