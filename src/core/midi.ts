import { chordMidiNotes } from './theory';
import {
  BEATS_PER_BAR, DRUM_LANES, GM_DRUM_NOTES, STEPS_PER_BAR,
  type Project,
} from './types';
import { songLengthBars } from './project';

/** Ticks per quarter note in exported files. */
export const PPQ = 480;
const TICKS_PER_STEP = PPQ / 4; // 16th notes

export function vlq(n: number): number[] {
  if (n < 0) throw new Error('vlq: negative delta');
  const bytes = [n & 0x7f];
  let rest = n >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
}

interface TimedEvent {
  tick: number;
  /** Sort order at equal ticks: meta/program first, then note-offs, then note-ons. */
  priority: number;
  data: number[];
}

class TrackBuilder {
  private events: TimedEvent[] = [];

  meta(tick: number, type: number, bytes: number[]): void {
    this.events.push({ tick, priority: 0, data: [0xff, type, ...vlq(bytes.length), ...bytes] });
  }

  metaText(tick: number, type: number, text: string): void {
    this.meta(tick, type, Array.from(new TextEncoder().encode(text)));
  }

  programChange(tick: number, channel: number, program: number): void {
    this.events.push({ tick, priority: 0, data: [0xc0 | channel, program] });
  }

  note(tick: number, channel: number, note: number, velocity: number, durationTicks: number): void {
    this.events.push({ tick, priority: 2, data: [0x90 | channel, note, velocity] });
    this.events.push({ tick: tick + durationTicks, priority: 1, data: [0x80 | channel, note, 0] });
  }

  build(endTick: number): Uint8Array {
    const sorted = [...this.events].sort((a, b) => a.tick - b.tick || a.priority - b.priority);
    const body: number[] = [];
    let lastTick = 0;
    for (const ev of sorted) {
      body.push(...vlq(ev.tick - lastTick), ...ev.data);
      lastTick = ev.tick;
    }
    // End of track.
    body.push(...vlq(Math.max(endTick, lastTick) - lastTick), 0xff, 0x2f, 0x00);
    const chunk = new Uint8Array(8 + body.length);
    chunk.set([0x4d, 0x54, 0x72, 0x6b]); // 'MTrk'
    new DataView(chunk.buffer).setUint32(4, body.length);
    chunk.set(body, 8);
    return chunk;
  }
}

function header(numTracks: number): Uint8Array {
  const h = new Uint8Array(14);
  h.set([0x4d, 0x54, 0x68, 0x64]); // 'MThd'
  const dv = new DataView(h.buffer);
  dv.setUint32(4, 6);
  dv.setUint16(8, 1); // format 1
  dv.setUint16(10, numTracks);
  dv.setUint16(12, PPQ);
  return h;
}

/**
 * Export the whole song as a format-1 SMF:
 * track 0 = tempo/time-signature/section markers, track 1 = chords (ch 1, piano),
 * track 2 = drums (ch 10, General MIDI mapping).
 */
export function exportSongMidi(project: Project): Uint8Array {
  const lengthBars = Math.max(songLengthBars(project), 1);
  const endTick = lengthBars * BEATS_PER_BAR * PPQ;

  const conductor = new TrackBuilder();
  conductor.metaText(0, 0x03, project.name);
  const usPerQuarter = Math.round(60_000_000 / project.tempo);
  conductor.meta(0, 0x51, [(usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff]);
  conductor.meta(0, 0x58, [4, 2, 24, 8]); // 4/4
  for (const section of project.sections) {
    conductor.metaText(section.startBar * BEATS_PER_BAR * PPQ, 0x06, section.name);
  }

  const chords = new TrackBuilder();
  chords.metaText(0, 0x03, 'Chords');
  chords.programChange(0, 0, 0); // acoustic grand piano
  const chordPatternById = new Map(project.chordPatterns.map((p) => [p.id, p]));
  for (const pl of project.arrangement.chordLane) {
    const pattern = chordPatternById.get(pl.patternId);
    if (!pattern) continue;
    const baseTick = pl.startBar * BEATS_PER_BAR * PPQ;
    for (const ev of pattern.chords) {
      const tick = baseTick + ev.startBeat * PPQ;
      // Shorten slightly so repeated chords re-articulate instead of merging.
      const dur = ev.durationBeats * PPQ - 10;
      for (const note of chordMidiNotes(ev.root, ev.quality, ev.octave)) {
        chords.note(tick, 0, note, 90, dur);
      }
    }
  }

  const drums = new TrackBuilder();
  drums.metaText(0, 0x03, 'Drums');
  const drumPatternById = new Map(project.drumPatterns.map((p) => [p.id, p]));
  for (const pl of project.arrangement.drumLane) {
    const pattern = drumPatternById.get(pl.patternId);
    if (!pattern) continue;
    const baseTick = pl.startBar * BEATS_PER_BAR * PPQ;
    for (const lane of DRUM_LANES) {
      const steps = pattern.steps[lane];
      for (let i = 0; i < pattern.bars * STEPS_PER_BAR; i++) {
        const v = steps[i];
        if (!v) continue;
        drums.note(baseTick + i * TICKS_PER_STEP, 9, GM_DRUM_NOTES[lane], v === 2 ? 118 : 88, TICKS_PER_STEP / 2);
      }
    }
  }

  const tracks = [conductor.build(endTick), chords.build(endTick), drums.build(endTick)];
  const total = 14 + tracks.reduce((n, t) => n + t.length, 0);
  const out = new Uint8Array(total);
  out.set(header(3), 0);
  let offset = 14;
  for (const t of tracks) {
    out.set(t, offset);
    offset += t.length;
  }
  return out;
}
