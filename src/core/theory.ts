import type { ChordEvent, ChordQualityId, KeySelection, PitchClass } from './types';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface ChordQuality {
  id: ChordQualityId;
  /** Display suffix, e.g. 'm7' → "Am7". */
  suffix: string;
  /** Semitone offsets from the root, stacked upward (root position, no inversions). */
  intervals: number[];
  group: 'triad' | 'sus' | '6th' | '7th' | 'extended';
}

export const CHORD_QUALITIES: ChordQuality[] = [
  { id: 'maj', suffix: '', intervals: [0, 4, 7], group: 'triad' },
  { id: 'min', suffix: 'm', intervals: [0, 3, 7], group: 'triad' },
  { id: 'dim', suffix: 'dim', intervals: [0, 3, 6], group: 'triad' },
  { id: 'aug', suffix: 'aug', intervals: [0, 4, 8], group: 'triad' },
  { id: 'sus2', suffix: 'sus2', intervals: [0, 2, 7], group: 'sus' },
  { id: 'sus4', suffix: 'sus4', intervals: [0, 5, 7], group: 'sus' },
  { id: '6', suffix: '6', intervals: [0, 4, 7, 9], group: '6th' },
  { id: 'm6', suffix: 'm6', intervals: [0, 3, 7, 9], group: '6th' },
  { id: '7', suffix: '7', intervals: [0, 4, 7, 10], group: '7th' },
  { id: 'maj7', suffix: 'maj7', intervals: [0, 4, 7, 11], group: '7th' },
  { id: 'm7', suffix: 'm7', intervals: [0, 3, 7, 10], group: '7th' },
  { id: 'm7b5', suffix: 'm7♭5', intervals: [0, 3, 6, 10], group: '7th' },
  { id: 'dim7', suffix: 'dim7', intervals: [0, 3, 6, 9], group: '7th' },
  { id: '9', suffix: '9', intervals: [0, 4, 7, 10, 14], group: 'extended' },
  { id: 'maj9', suffix: 'maj9', intervals: [0, 4, 7, 11, 14], group: 'extended' },
  { id: 'm9', suffix: 'm9', intervals: [0, 3, 7, 10, 14], group: 'extended' },
  { id: 'add9', suffix: 'add9', intervals: [0, 4, 7, 14], group: 'extended' },
  { id: '11', suffix: '11', intervals: [0, 4, 7, 10, 14, 17], group: 'extended' },
  { id: 'm11', suffix: 'm11', intervals: [0, 3, 7, 10, 14, 17], group: 'extended' },
  { id: '13', suffix: '13', intervals: [0, 4, 7, 10, 14, 21], group: 'extended' },
  { id: 'm13', suffix: 'm13', intervals: [0, 3, 7, 10, 14, 21], group: 'extended' },
];

const QUALITY_BY_ID = new Map(CHORD_QUALITIES.map((q) => [q.id, q]));

export function quality(id: ChordQualityId): ChordQuality {
  const q = QUALITY_BY_ID.get(id);
  if (!q) throw new Error(`Unknown chord quality: ${id}`);
  return q;
}

export function chordName(root: PitchClass, q: ChordQualityId): string {
  return NOTE_NAMES[((root % 12) + 12) % 12] + quality(q).suffix;
}

/** Root-position MIDI notes, stacked up from the root at the given octave (C4 = 60). */
export function chordMidiNotes(root: PitchClass, q: ChordQualityId, octave: number): number[] {
  const rootMidi = 12 * (octave + 1) + root;
  return quality(q).intervals.map((i) => rootMidi + i);
}

export function chordEventName(ev: ChordEvent): string {
  return chordName(ev.root, ev.quality);
}

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

const MAJOR_TRIADS: ChordQualityId[] = ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'];
const MINOR_TRIADS: ChordQualityId[] = ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'];
const MAJOR_SEVENTHS: ChordQualityId[] = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
const MINOR_SEVENTHS: ChordQualityId[] = ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'];

const MAJOR_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const MINOR_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

export interface DiatonicChord {
  degree: number; // 0-based scale degree
  numeral: string;
  root: PitchClass;
  quality: ChordQualityId;
  name: string;
}

/** The I–VII chords of the selected key, as triads or diatonic 7th chords. */
export function diatonicChords(key: KeySelection, sevenths: boolean): DiatonicChord[] {
  const scale = key.mode === 'major' ? MAJOR_SCALE : MINOR_SCALE;
  const qualities =
    key.mode === 'major'
      ? sevenths ? MAJOR_SEVENTHS : MAJOR_TRIADS
      : sevenths ? MINOR_SEVENTHS : MINOR_TRIADS;
  const numerals = key.mode === 'major' ? MAJOR_NUMERALS : MINOR_NUMERALS;
  return scale.map((offset, degree) => {
    const root = (key.tonic + offset) % 12;
    return {
      degree,
      numeral: numerals[degree],
      root,
      quality: qualities[degree],
      name: chordName(root, qualities[degree]),
    };
  });
}

export function keyName(key: KeySelection): string {
  return `${NOTE_NAMES[key.tonic]} ${key.mode}`;
}
