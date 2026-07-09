/** Pitch class 0–11, 0 = C. */
export type PitchClass = number;

export type ChordQualityId =
  | 'maj' | 'min' | 'dim' | 'aug'
  | 'sus2' | 'sus4'
  | '6' | 'm6'
  | '7' | 'maj7' | 'm7' | 'm7b5' | 'dim7'
  | '9' | 'maj9' | 'm9' | 'add9'
  | '11' | 'm11'
  | '13' | 'm13';

export interface ChordEvent {
  /** Quarter-note position within the pattern (0 … bars*4-1). */
  startBeat: number;
  /** Duration in quarter notes. Never crosses a bar line. */
  durationBeats: number;
  root: PitchClass;
  quality: ChordQualityId;
  /** Octave of the root; root MIDI note = 12 * (octave + 1) + root. */
  octave: number;
}

export interface ChordPattern {
  id: string;
  name: string;
  /** Pattern length in bars of 4/4. */
  bars: 1 | 2 | 4;
  chords: ChordEvent[];
}

export const DRUM_LANES = [
  'crash', 'openHat', 'closedHat', 'cowbell',
  'highTom', 'lowTom', 'clap', 'snare', 'kick',
] as const;
export type DrumLane = (typeof DRUM_LANES)[number];

/** 0 = off, 1 = normal hit, 2 = accent. */
export type StepValue = 0 | 1 | 2;

export interface DrumPattern {
  id: string;
  name: string;
  bars: 1 | 2 | 4;
  /** One array per lane, length = bars * 16 (16th-note steps). */
  steps: Record<DrumLane, StepValue[]>;
}

export interface Placement {
  id: string;
  patternId: string;
  /** 0-based bar at which the pattern starts. */
  startBar: number;
}

export interface SectionLabel {
  id: string;
  name: string;
  startBar: number;
}

export interface KeySelection {
  tonic: PitchClass;
  mode: 'major' | 'minor';
}

export interface Project {
  version: 1;
  name: string;
  tempo: number;
  /** Only 4/4 for now; kept in the file so the format survives future signatures. */
  timeSignature: [number, number];
  key: KeySelection | null;
  chordPatterns: ChordPattern[];
  drumPatterns: DrumPattern[];
  arrangement: {
    chordLane: Placement[];
    drumLane: Placement[];
  };
  sections: SectionLabel[];
}

export const BEATS_PER_BAR = 4;
export const STEPS_PER_BAR = 16;

/** General MIDI percussion key numbers (channel 10). */
export const GM_DRUM_NOTES: Record<DrumLane, number> = {
  kick: 36,
  snare: 38,
  clap: 39,
  lowTom: 45,
  closedHat: 42,
  openHat: 46,
  crash: 49,
  highTom: 50,
  cowbell: 56,
};

export const DRUM_LANE_LABELS: Record<DrumLane, string> = {
  crash: 'Crash',
  openHat: 'Open Hat',
  closedHat: 'Closed Hat',
  cowbell: 'Cowbell',
  highTom: 'Hi Tom',
  lowTom: 'Lo Tom',
  clap: 'Clap',
  snare: 'Snare',
  kick: 'Kick',
};
