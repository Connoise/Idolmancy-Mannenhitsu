import { useState } from 'react';
import { chordPatternEvents } from '../core/events';
import { chordEventName } from '../core/theory';
import { BEATS_PER_BAR, type ChordEvent, type ChordPattern, type Project } from '../core/types';
import { ChordPicker, type ChordPickerResult } from './ChordPicker';
import { usePlayback } from './usePlayback';

interface PickerState {
  startBeat: number;
  /** The event being edited, if any (otherwise this is an add). */
  existing: ChordEvent | null;
}

export function ChordPatternEditor({ project, pattern, onChange, onBack }: {
  project: Project;
  pattern: ChordPattern;
  onChange: (pattern: ChordPattern) => void;
  onBack: () => void;
}) {
  const [picker, setPicker] = useState<PickerState | null>(null);
  const { playing, beat, play, stop } = usePlayback();

  const eventAt = (beatPos: number): ChordEvent | undefined =>
    pattern.chords.find((c) => beatPos >= c.startBeat && beatPos < c.startBeat + c.durationBeats);

  const setBars = (bars: 1 | 2 | 4) => {
    onChange({
      ...pattern,
      bars,
      chords: pattern.chords.filter((c) => c.startBeat + c.durationBeats <= bars * BEATS_PER_BAR),
    });
  };

  /** Longest legal duration from startBeat: to end of bar, or up to the next chord. */
  const maxDurationAt = (startBeat: number, ignore: ChordEvent | null): number => {
    let max = BEATS_PER_BAR - (startBeat % BEATS_PER_BAR);
    for (const c of pattern.chords) {
      if (c === ignore) continue;
      if (c.startBeat > startBeat) max = Math.min(max, c.startBeat - startBeat);
    }
    return Math.max(1, max);
  };

  const applyPicker = (result: ChordPickerResult) => {
    if (!picker) return;
    const ev: ChordEvent = { startBeat: picker.startBeat, ...result };
    const rest = pattern.chords.filter((c) => c !== picker.existing);
    // Drop anything the (possibly longer) event now covers.
    const kept = rest.filter(
      (c) => c.startBeat + c.durationBeats <= ev.startBeat || c.startBeat >= ev.startBeat + ev.durationBeats
    );
    onChange({ ...pattern, chords: [...kept, ev].sort((a, b) => a.startBeat - b.startBeat) });
    setPicker(null);
  };

  const deletePicked = () => {
    if (!picker?.existing) return;
    onChange({ ...pattern, chords: pattern.chords.filter((c) => c !== picker.existing) });
    setPicker(null);
  };

  const bars = Array.from({ length: pattern.bars }, (_, i) => i);

  return (
    <div className="editor">
      <div className="editor-head">
        <button className="btn icon" onClick={() => { stop(); onBack(); }} aria-label="Back">←</button>
        <input
          className="name-input"
          value={pattern.name}
          onChange={(e) => onChange({ ...pattern, name: e.target.value })}
          aria-label="Pattern name"
        />
        <button
          className={`btn ${playing ? 'danger' : 'primary'}`}
          onClick={() => (playing ? stop() : play(chordPatternEvents(pattern), project.tempo, true))}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
      </div>

      <div className="editor-controls">
        <span className="picker-label">Bars</span>
        <div className="chip-row">
          {([1, 2, 4] as const).map((b) => (
            <button key={b} className={`chip ${pattern.bars === b ? 'active' : ''}`} onClick={() => setBars(b)}>
              {b}
            </button>
          ))}
        </div>
        <span className="hint">Tap a beat to add a chord · tap a chord to edit</span>
      </div>

      <div className="chord-bars">
        {bars.map((bar) => {
          const cells: React.ReactNode[] = [];
          let beatInBar = 0;
          while (beatInBar < BEATS_PER_BAR) {
            const globalBeat = bar * BEATS_PER_BAR + beatInBar;
            const ev = eventAt(globalBeat);
            if (ev && ev.startBeat === globalBeat) {
              const isPlaying =
                playing && beat >= ev.startBeat && beat < ev.startBeat + ev.durationBeats;
              cells.push(
                <button
                  key={beatInBar}
                  className={`chord-cell filled ${isPlaying ? 'playing' : ''}`}
                  style={{ gridColumn: `span ${ev.durationBeats}` }}
                  onClick={() => setPicker({ startBeat: ev.startBeat, existing: ev })}
                >
                  {chordEventName(ev)}
                </button>
              );
              beatInBar += ev.durationBeats;
            } else if (ev) {
              // Mid-event beat (shouldn't happen since events start on their first beat).
              beatInBar += 1;
            } else {
              cells.push(
                <button
                  key={beatInBar}
                  className="chord-cell empty"
                  onClick={() => setPicker({ startBeat: globalBeat, existing: null })}
                >
                  +
                </button>
              );
              beatInBar += 1;
            }
          }
          const barPlaying = playing && Math.floor(beat / BEATS_PER_BAR) === bar;
          return (
            <div key={bar} className={`chord-bar ${barPlaying ? 'playing-bar' : ''}`}>
              <span className="bar-num">{bar + 1}</span>
              <div className="chord-bar-grid">{cells}</div>
            </div>
          );
        })}
      </div>

      {picker && (
        <ChordPicker
          initial={
            picker.existing ?? {
              root: project.key?.tonic ?? 0,
              quality: 'maj',
              octave: 3,
              durationBeats: maxDurationAt(picker.startBeat, null),
            }
          }
          maxDuration={maxDurationAt(picker.startBeat, picker.existing)}
          songKey={project.key}
          isEdit={picker.existing !== null}
          onApply={applyPicker}
          onDelete={deletePicked}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
