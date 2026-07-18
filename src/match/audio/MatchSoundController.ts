import {
  createAssetSoundEngine,
  createBrowserAudioFactory,
  MATCH_SOUND_MANIFEST,
  type BrowserAudioSource as BrowserSoundAssetSource,
} from "./MatchSoundAssets.js";

export type MatchSoundCue =
  | { kind: "turn-tick"; urgent: boolean }
  | { kind: "movement" }
  | { kind: "weapon-fire"; classId: string }
  | { kind: "impact" }
  | { kind: "hit" }
  | { kind: "damage-ko" }
  | { kind: "void-drop" };

export interface MatchSoundEngine {
  play(cue: MatchSoundCue): void;
}

export interface MatchSoundControllerOptions {
  engine: MatchSoundEngine;
  movementPulseSeconds?: number;
  urgentTurnSecondThreshold?: number;
}

export interface UpdateTurnTickInput {
  activeVehicleId: string;
  turnTime: number;
  canAct: boolean;
}

export interface UpdateMovementSoundInput {
  moving: boolean;
  deltaSeconds: number;
}

export class MatchSoundController {
  private readonly movementPulseSeconds: number;
  private readonly urgentTurnSecondThreshold: number;
  private muted = false;
  private activeVehicleId?: string;
  private displayedTurnSecond?: number;
  private movementPulseElapsed = 0;
  private movementWasActive = false;

  constructor(private readonly options: MatchSoundControllerOptions) {
    this.movementPulseSeconds = options.movementPulseSeconds ?? 0.12;
    this.urgentTurnSecondThreshold = options.urgentTurnSecondThreshold ?? 5;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    this.movementPulseElapsed = 0;
    this.movementWasActive = false;
    return this.muted;
  }

  beginTurn(activeVehicleId: string, turnTime: number): void {
    this.activeVehicleId = activeVehicleId;
    this.displayedTurnSecond = displayedSecond(turnTime);
    this.movementPulseElapsed = 0;
    this.movementWasActive = false;
  }

  updateTurnTick(input: UpdateTurnTickInput): void {
    if (!input.canAct) {
      return;
    }

    const currentSecond = displayedSecond(input.turnTime);
    if (this.activeVehicleId !== input.activeVehicleId || this.displayedTurnSecond === undefined) {
      this.beginTurn(input.activeVehicleId, input.turnTime);
      return;
    }

    if (currentSecond >= this.displayedTurnSecond) {
      this.displayedTurnSecond = currentSecond;
      return;
    }

    this.displayedTurnSecond = currentSecond;
    this.play({
      kind: "turn-tick",
      urgent: currentSecond <= this.urgentTurnSecondThreshold,
    });
  }

  updateMovement(input: UpdateMovementSoundInput): void {
    if (!input.moving) {
      this.movementPulseElapsed = 0;
      this.movementWasActive = false;
      return;
    }

    if (!this.movementWasActive) {
      this.movementWasActive = true;
      this.movementPulseElapsed = 0;
      this.play({ kind: "movement" });
      return;
    }

    this.movementPulseElapsed += Math.max(0, input.deltaSeconds);
    if (this.movementPulseElapsed < this.movementPulseSeconds) {
      return;
    }

    this.movementPulseElapsed %= this.movementPulseSeconds;
    this.play({ kind: "movement" });
  }

  playWeaponFire(classId: string): void {
    this.play({ kind: "weapon-fire", classId });
  }

  playImpact(): void {
    this.play({ kind: "impact" });
  }

  playHit(): void {
    this.play({ kind: "hit" });
  }

  playDamageKo(): void {
    this.play({ kind: "damage-ko" });
  }

  playVoidDrop(): void {
    this.play({ kind: "void-drop" });
  }

  private play(cue: MatchSoundCue): void {
    if (this.muted) {
      return;
    }

    this.options.engine.play(cue);
  }
}

export function createBrowserSoundEngine(source: BrowserAudioSource = globalThis as BrowserAudioSource): MatchSoundEngine {
  return createAssetSoundEngine({
    manifest: MATCH_SOUND_MANIFEST,
    fallback: new ProceduralSoundEngine(source),
    createAudio: createBrowserAudioFactory(source),
  });
}

interface BrowserAudioSource extends BrowserSoundAssetSource {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

interface ToneInput {
  frequency: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  endFrequency?: number;
  delaySeconds?: number;
}

class ProceduralSoundEngine implements MatchSoundEngine {
  private context?: AudioContext;

  constructor(private readonly source: BrowserAudioSource) {}

  play(cue: MatchSoundCue): void {
    const context = this.audioContext();
    if (!context) {
      return;
    }

    resumeContext(context);

    switch (cue.kind) {
      case "turn-tick":
        this.playTone(context, {
          frequency: cue.urgent ? 980 : 620,
          endFrequency: cue.urgent ? 1180 : 680,
          duration: cue.urgent ? 0.055 : 0.04,
          volume: cue.urgent ? 0.055 : 0.032,
          type: "square",
        });
        return;
      case "movement":
        this.playTone(context, {
          frequency: 110,
          endFrequency: 86,
          duration: 0.045,
          volume: 0.022,
          type: "triangle",
        });
        return;
      case "weapon-fire":
        this.playWeaponFire(context, cue.classId);
        return;
      case "impact":
        this.playNoise(context, 0.11, 0.055, 900);
        this.playTone(context, {
          frequency: 120,
          endFrequency: 54,
          duration: 0.13,
          volume: 0.05,
          type: "sine",
        });
        return;
      case "hit":
        this.playTone(context, {
          frequency: 260,
          endFrequency: 190,
          duration: 0.08,
          volume: 0.045,
          type: "sawtooth",
        });
        return;
      case "damage-ko":
        this.playTone(context, {
          frequency: 240,
          endFrequency: 70,
          duration: 0.28,
          volume: 0.07,
          type: "triangle",
        });
        this.playNoise(context, 0.12, 0.032, 420);
        return;
      case "void-drop":
        this.playTone(context, {
          frequency: 180,
          endFrequency: 38,
          duration: 0.42,
          volume: 0.075,
          type: "sine",
        });
        this.playNoise(context, 0.18, 0.03, 520);
        return;
    }
  }

  private playWeaponFire(context: AudioContext, classId: string): void {
    const profile = weaponProfile(classId);
    this.playTone(context, {
      frequency: profile.frequency,
      endFrequency: profile.endFrequency,
      duration: profile.duration,
      volume: profile.volume,
      type: profile.type,
    });
    if (profile.noiseVolume > 0) {
      this.playNoise(context, profile.duration * 0.8, profile.noiseVolume, profile.noiseFilter);
    }
  }

  private playTone(context: AudioContext, input: ToneInput): void {
    const start = context.currentTime + (input.delaySeconds ?? 0);
    const end = start + input.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = input.type ?? "sine";
    oscillator.frequency.setValueAtTime(Math.max(1, input.frequency), start);
    if (input.endFrequency !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, input.endFrequency), end);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, input.volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }

  private playNoise(context: AudioContext, duration: number, volume: number, filterFrequency: number): void {
    const frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      const fade = 1 - i / frameCount;
      data[i] = (Math.random() * 2 - 1) * fade;
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime;
    const end = start + duration;

    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(filterFrequency, start);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    source.start(start);
    source.stop(end + 0.02);
  }

  private audioContext(): AudioContext | undefined {
    if (this.context) {
      return this.context;
    }

    const AudioContextConstructor = this.source.AudioContext ?? this.source.webkitAudioContext;
    if (!AudioContextConstructor) {
      return undefined;
    }

    try {
      this.context = new AudioContextConstructor();
      return this.context;
    } catch {
      return undefined;
    }
  }
}

function displayedSecond(turnTime: number): number {
  return Math.max(0, Math.ceil(turnTime));
}

function resumeContext(context: AudioContext): void {
  if (context.state !== "suspended") {
    return;
  }

  void context.resume().catch(() => undefined);
}

function weaponProfile(classId: string): {
  frequency: number;
  endFrequency: number;
  duration: number;
  volume: number;
  type: OscillatorType;
  noiseVolume: number;
  noiseFilter: number;
} {
  switch (classId) {
    case "bunger":
      return {
        frequency: 96,
        endFrequency: 48,
        duration: 0.18,
        volume: 0.07,
        type: "sawtooth",
        noiseVolume: 0.045,
        noiseFilter: 720,
      };
    case "flashkick":
      return {
        frequency: 460,
        endFrequency: 720,
        duration: 0.12,
        volume: 0.05,
        type: "square",
        noiseVolume: 0.018,
        noiseFilter: 1200,
      };
    case "sunspike":
      return {
        frequency: 620,
        endFrequency: 980,
        duration: 0.14,
        volume: 0.052,
        type: "triangle",
        noiseVolume: 0.015,
        noiseFilter: 1600,
      };
    case "glitch":
      return {
        frequency: 380,
        endFrequency: 1520,
        duration: 0.09,
        volume: 0.048,
        type: "square",
        noiseVolume: 0.012,
        noiseFilter: 2200,
      };
    default:
      return {
        frequency: 220,
        endFrequency: 120,
        duration: 0.13,
        volume: 0.05,
        type: "sawtooth",
        noiseVolume: 0.02,
        noiseFilter: 900,
      };
  }
}
