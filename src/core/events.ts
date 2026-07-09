import { chordMidiNotes } from './theory';
import {
  BEATS_PER_BAR, DRUM_LANES, STEPS_PER_BAR,
  type ChordPattern, type DrumLane, type DrumPattern, type Project,
} from './types';
import { songLengthBars } from './project';

/** A schedulable event, positioned in quarter-note beats from the start. */
export type PlayEvent =
  | { beat: number; kind: 'note'; midi: number; durationBeats: number; velocity: number }
  | { beat: number; kind: 'drum'; lane: DrumLane; velocity: number };

export interface PlaySequence {
  events: PlayEvent[];
  totalBeats: number;
}

const NORMAL = 0.7;
const ACCENT = 1.0;

export function chordPatternEvents(pattern: ChordPattern): PlaySequence {
  const events: PlayEvent[] = [];
  for (const ev of pattern.chords) {
    for (const midi of chordMidiNotes(ev.root, ev.quality, ev.octave)) {
      events.push({ beat: ev.startBeat, kind: 'note', midi, durationBeats: ev.durationBeats, velocity: NORMAL });
    }
  }
  return { events, totalBeats: pattern.bars * BEATS_PER_BAR };
}

export function drumPatternEvents(pattern: DrumPattern): PlaySequence {
  const events: PlayEvent[] = [];
  for (const lane of DRUM_LANES) {
    const steps = pattern.steps[lane];
    for (let i = 0; i < pattern.bars * STEPS_PER_BAR; i++) {
      if (steps[i]) {
        events.push({ beat: i / 4, kind: 'drum', lane, velocity: steps[i] === 2 ? ACCENT : NORMAL });
      }
    }
  }
  return { events, totalBeats: pattern.bars * BEATS_PER_BAR };
}

export function songEvents(project: Project): PlaySequence {
  const events: PlayEvent[] = [];
  const chordById = new Map(project.chordPatterns.map((p) => [p.id, p]));
  const drumById = new Map(project.drumPatterns.map((p) => [p.id, p]));
  for (const pl of project.arrangement.chordLane) {
    const pattern = chordById.get(pl.patternId);
    if (!pattern) continue;
    const base = pl.startBar * BEATS_PER_BAR;
    for (const ev of chordPatternEvents(pattern).events) events.push({ ...ev, beat: ev.beat + base });
  }
  for (const pl of project.arrangement.drumLane) {
    const pattern = drumById.get(pl.patternId);
    if (!pattern) continue;
    const base = pl.startBar * BEATS_PER_BAR;
    for (const ev of drumPatternEvents(pattern).events) events.push({ ...ev, beat: ev.beat + base });
  }
  return { events, totalBeats: Math.max(songLengthBars(project), 1) * BEATS_PER_BAR };
}
