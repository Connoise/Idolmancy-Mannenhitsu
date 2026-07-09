import { describe, expect, it } from 'vitest';
import { exportSongMidi, vlq, PPQ } from './midi';
import { newProject, newChordPattern, newDrumPattern } from './project';
import type { Project } from './types';

describe('vlq', () => {
  it('encodes standard variable-length quantities', () => {
    expect(vlq(0)).toEqual([0x00]);
    expect(vlq(0x7f)).toEqual([0x7f]);
    expect(vlq(0x80)).toEqual([0x81, 0x00]);
    expect(vlq(0x3fff)).toEqual([0xff, 0x7f]);
    expect(vlq(0x4000)).toEqual([0x81, 0x80, 0x00]);
  });
});

function demoProject(): Project {
  const project = newProject();
  project.tempo = 100;
  const cp = newChordPattern('Prog');
  cp.bars = 1;
  cp.chords = [{ startBeat: 0, durationBeats: 4, root: 0, quality: 'maj', octave: 3 }];
  const dp = newDrumPattern('Beat');
  dp.steps.kick[0] = 1;
  dp.steps.snare[4] = 2;
  project.chordPatterns = [cp];
  project.drumPatterns = [dp];
  project.arrangement.chordLane = [{ id: 'pl1', patternId: cp.id, startBar: 0 }];
  project.arrangement.drumLane = [{ id: 'pl2', patternId: dp.id, startBar: 0 }];
  project.sections = [{ id: 's1', name: 'Intro', startBar: 0 }];
  return project;
}

describe('exportSongMidi', () => {
  const bytes = exportSongMidi(demoProject());

  it('writes a format-1 header with 3 tracks and the right PPQ', () => {
    const dv = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('MThd');
    expect(dv.getUint32(4)).toBe(6);
    expect(dv.getUint16(8)).toBe(1); // format 1
    expect(dv.getUint16(10)).toBe(3); // conductor + chords + drums
    expect(dv.getUint16(12)).toBe(PPQ);
  });

  it('contains three MTrk chunks whose lengths span the file exactly', () => {
    let offset = 14;
    let count = 0;
    const dv = new DataView(bytes.buffer);
    while (offset < bytes.length) {
      expect(String.fromCharCode(...bytes.slice(offset, offset + 4))).toBe('MTrk');
      offset += 8 + dv.getUint32(offset + 4);
      count++;
    }
    expect(offset).toBe(bytes.length);
    expect(count).toBe(3);
  });

  it('embeds the tempo as microseconds per quarter note', () => {
    // 100 BPM → 600000 µs = 0x0927C0
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(' ');
    expect(hex).toContain('ff 51 03 09 27 c0');
  });

  it('writes the 4/4 time signature meta event', () => {
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(' ');
    expect(hex).toContain('ff 58 04 04 02 18 08');
  });

  it('puts drums on channel 10 with GM notes and accent velocity', () => {
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join(' ');
    expect(hex).toContain('99 24 58'); // note-on ch10, kick (36), normal velocity 88
    expect(hex).toContain('99 26 76'); // note-on ch10, snare (38), accent velocity 118
  });
});
