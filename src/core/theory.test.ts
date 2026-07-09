import { describe, expect, it } from 'vitest';
import { chordMidiNotes, chordName, diatonicChords, CHORD_QUALITIES } from './theory';

describe('chordMidiNotes', () => {
  it('stacks a C major triad up from the root (C3 = 48)', () => {
    expect(chordMidiNotes(0, 'maj', 3)).toEqual([48, 52, 55]);
  });
  it('voices extensions above the octave (Am13)', () => {
    // A3 = 57
    expect(chordMidiNotes(9, 'm13', 3)).toEqual([57, 60, 64, 67, 71, 78]);
  });
});

describe('chordName', () => {
  it('names chords with quality suffixes', () => {
    expect(chordName(0, 'maj')).toBe('C');
    expect(chordName(9, 'm7')).toBe('Am7');
    expect(chordName(6, 'sus4')).toBe('F#sus4');
  });
});

describe('diatonicChords', () => {
  it('gives the diatonic triads of C major', () => {
    const names = diatonicChords({ tonic: 0, mode: 'major' }, false).map((c) => c.name);
    expect(names).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
  });
  it('gives the diatonic 7ths of A minor', () => {
    const names = diatonicChords({ tonic: 9, mode: 'minor' }, true).map((c) => c.name);
    expect(names).toEqual(['Am7', 'Bm7♭5', 'Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7']);
  });
});

describe('chord quality table', () => {
  it('every quality starts at the root and stacks upward', () => {
    for (const q of CHORD_QUALITIES) {
      expect(q.intervals[0]).toBe(0);
      for (let i = 1; i < q.intervals.length; i++) {
        expect(q.intervals[i]).toBeGreaterThan(q.intervals[i - 1]);
      }
    }
  });
});
