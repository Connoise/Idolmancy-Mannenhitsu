import type { DrumLane } from './types';
import type { PlaySequence } from './events';

/**
 * Small Web Audio engine: a simple piano-ish voice for chords, synthesized
 * drum voices for the nine lanes, and a lookahead scheduler for sequences.
 * No dependencies, works on Android Chrome and desktop browsers.
 */

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function pianoNote(ctx: AudioContext, dest: AudioNode, midi: number, time: number, durSec: number, vel: number): void {
  const freq = midiToFreq(midi);
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = Math.min(freq * 6, 6000);
  gain.connect(filter);
  filter.connect(dest);

  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.value = freq;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;
  const osc2gain = ctx.createGain();
  osc2gain.gain.value = 0.25;
  osc1.connect(gain);
  osc2.connect(osc2gain);
  osc2gain.connect(gain);

  const peak = 0.22 * vel;
  const end = time + durSec;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + 0.008);
  gain.gain.setTargetAtTime(peak * 0.35, time + 0.02, 0.35); // slow piano-like decay
  gain.gain.setTargetAtTime(0, end, 0.05); // release
  osc1.start(time);
  osc2.start(time);
  osc1.stop(end + 0.4);
  osc2.stop(end + 0.4);
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(ctx: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function noiseBurst(
  ctx: AudioContext, dest: AudioNode, time: number, vel: number,
  opts: { decay: number; filterType: BiquadFilterType; freq: number; q?: number; level?: number }
): void {
  const src = ctx.createBufferSource();
  src.buffer = getNoise(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = opts.filterType;
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q ?? 1;
  const gain = ctx.createGain();
  const peak = (opts.level ?? 0.5) * vel;
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + opts.decay);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(time);
  src.stop(time + opts.decay + 0.05);
}

function tonalHit(
  ctx: AudioContext, dest: AudioNode, time: number, vel: number,
  opts: { type: OscillatorType; from: number; to: number; sweep: number; decay: number; level?: number }
): void {
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, time);
  osc.frequency.exponentialRampToValueAtTime(Math.max(opts.to, 1), time + opts.sweep);
  const gain = ctx.createGain();
  const peak = (opts.level ?? 0.8) * vel;
  gain.gain.setValueAtTime(peak, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + opts.decay);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + opts.decay + 0.05);
}

function drumHit(ctx: AudioContext, dest: AudioNode, lane: DrumLane, time: number, vel: number): void {
  switch (lane) {
    case 'kick':
      tonalHit(ctx, dest, time, vel, { type: 'sine', from: 150, to: 48, sweep: 0.09, decay: 0.3, level: 1.0 });
      break;
    case 'snare':
      tonalHit(ctx, dest, time, vel, { type: 'triangle', from: 220, to: 160, sweep: 0.05, decay: 0.12, level: 0.4 });
      noiseBurst(ctx, dest, time, vel, { decay: 0.17, filterType: 'bandpass', freq: 2200, q: 0.8, level: 0.55 });
      break;
    case 'clap': {
      // Three short bursts approximate a clap's stutter.
      for (const [dt, lvl] of [[0, 0.4], [0.012, 0.3], [0.025, 0.5]] as const) {
        noiseBurst(ctx, dest, time + dt, vel, { decay: 0.12, filterType: 'bandpass', freq: 1400, q: 1.5, level: lvl });
      }
      break;
    }
    case 'closedHat':
      noiseBurst(ctx, dest, time, vel, { decay: 0.045, filterType: 'highpass', freq: 7500, level: 0.4 });
      break;
    case 'openHat':
      noiseBurst(ctx, dest, time, vel, { decay: 0.35, filterType: 'highpass', freq: 7000, level: 0.35 });
      break;
    case 'crash':
      noiseBurst(ctx, dest, time, vel, { decay: 1.1, filterType: 'highpass', freq: 4500, level: 0.35 });
      noiseBurst(ctx, dest, time, vel, { decay: 0.5, filterType: 'bandpass', freq: 9000, q: 0.5, level: 0.2 });
      break;
    case 'cowbell': {
      // Two detuned squares, classic 808-style cowbell.
      for (const f of [540, 800]) {
        tonalHit(ctx, dest, time, vel, { type: 'square', from: f, to: f, sweep: 0.01, decay: 0.18, level: 0.15 });
      }
      break;
    }
    case 'highTom':
      tonalHit(ctx, dest, time, vel, { type: 'sine', from: 240, to: 150, sweep: 0.15, decay: 0.28, level: 0.7 });
      break;
    case 'lowTom':
      tonalHit(ctx, dest, time, vel, { type: 'sine', from: 150, to: 90, sweep: 0.18, decay: 0.34, level: 0.8 });
      break;
  }
}

export interface PlaybackHandle {
  stop(): void;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private onStopped: (() => void) | null = null;

  private ensureCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 12;
      this.master.connect(limiter);
      limiter.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Immediate one-shot previews (chord picker, lane labels). */
  previewNotes(midiNotes: number[], durSec = 1.2): void {
    const ctx = this.ensureCtx();
    for (const n of midiNotes) pianoNote(ctx, this.master!, n, ctx.currentTime + 0.01, durSec, 0.7);
  }

  previewDrum(lane: DrumLane): void {
    const ctx = this.ensureCtx();
    drumHit(ctx, this.master!, lane, ctx.currentTime + 0.01, 0.9);
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  /**
   * Play a sequence with a lookahead scheduler.
   * `onBeat` fires roughly per 16th with the current beat position (for playheads).
   */
  play(
    seq: PlaySequence,
    bpm: number,
    opts: { loop: boolean; onBeat?: (beat: number) => void; onEnd?: () => void }
  ): PlaybackHandle {
    this.stop();
    const ctx = this.ensureCtx();
    const dest = this.master!;
    const secPerBeat = 60 / bpm;
    const events = [...seq.events].sort((a, b) => a.beat - b.beat);
    const startTime = ctx.currentTime + 0.1;
    const LOOKAHEAD = 0.15;

    let cursor = 0; // next event index within the current pass
    let passStart = startTime; // context time at beat 0 of the current pass
    let stopped = false;

    this.onStopped = opts.onEnd ?? null;

    const tick = () => {
      if (stopped) return;
      const now = ctx.currentTime;
      const horizon = now + LOOKAHEAD;
      // Schedule all events whose time falls before the horizon.
      for (;;) {
        if (cursor >= events.length) {
          const passEnd = passStart + seq.totalBeats * secPerBeat;
          if (passEnd <= horizon) {
            if (opts.loop) {
              passStart = passEnd;
              cursor = 0;
              continue;
            } else if (now >= passEnd) {
              this.stop();
              return;
            }
          }
          break;
        }
        const ev = events[cursor];
        const t = passStart + ev.beat * secPerBeat;
        if (t > horizon) break;
        if (ev.kind === 'note') {
          pianoNote(ctx, dest, ev.midi, t, ev.durationBeats * secPerBeat * 0.95, ev.velocity);
        } else {
          drumHit(ctx, dest, ev.lane, t, ev.velocity);
        }
        cursor += 1;
      }
      if (opts.onBeat && now >= startTime) {
        const beat = (now - passStart) / secPerBeat;
        opts.onBeat(Math.min(beat, seq.totalBeats));
      }
    };

    this.timer = setInterval(tick, 30);
    tick();
    return {
      stop: () => {
        stopped = true;
        this.stop();
      },
    };
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
      const cb = this.onStopped;
      this.onStopped = null;
      cb?.();
    }
  }
}

export const audioEngine = new AudioEngine();
