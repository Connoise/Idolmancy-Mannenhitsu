import { useState } from 'react';
import { audioEngine } from '../core/audio';
import { drumPatternEvents } from '../core/events';
import { resizeDrumSteps } from '../core/project';
import {
  DRUM_LANES, DRUM_LANE_LABELS, STEPS_PER_BAR,
  type DrumLane, type DrumPattern, type Project, type StepValue,
} from '../core/types';
import { usePlayback } from './usePlayback';

export function DrumPatternEditor({ project, pattern, onChange, onBack }: {
  project: Project;
  pattern: DrumPattern;
  onChange: (pattern: DrumPattern) => void;
  onBack: () => void;
}) {
  const [barPage, setBarPage] = useState(0);
  const { playing, beat, play, stop } = usePlayback();

  const setBars = (bars: 1 | 2 | 4) => {
    onChange({ ...pattern, bars, steps: resizeDrumSteps(pattern.steps, bars) });
    setBarPage((p) => Math.min(p, bars - 1));
  };

  const cycleStep = (lane: DrumLane, index: number) => {
    const steps = { ...pattern.steps, [lane]: [...pattern.steps[lane]] };
    steps[lane][index] = ((steps[lane][index] + 1) % 3) as StepValue;
    onChange({ ...pattern, steps });
    if (steps[lane][index]) audioEngine.previewDrum(lane);
  };

  const pageOffset = barPage * STEPS_PER_BAR;
  const playingStep = playing ? Math.floor(beat * 4) : -1;

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
          onClick={() => (playing ? stop() : play(drumPatternEvents(pattern), project.tempo, true))}
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
        {pattern.bars > 1 && (
          <div className="chip-row">
            {Array.from({ length: pattern.bars }, (_, i) => (
              <button
                key={i}
                className={`chip ${barPage === i ? 'active' : ''}`}
                onClick={() => setBarPage(i)}
              >
                Bar {i + 1}
              </button>
            ))}
          </div>
        )}
        <span className="hint">Tap: off → on → accent · tap a lane name to hear it</span>
      </div>

      <div className="drum-grid-wrap">
        <div className="drum-grid">
          {DRUM_LANES.map((lane) => (
            <div key={lane} className="drum-row">
              <button className="drum-lane-label" onClick={() => audioEngine.previewDrum(lane)}>
                {DRUM_LANE_LABELS[lane]}
              </button>
              {Array.from({ length: STEPS_PER_BAR }, (_, i) => {
                const index = pageOffset + i;
                const v = pattern.steps[lane][index];
                const isNow = playingStep === index;
                return (
                  <button
                    key={i}
                    className={[
                      'step',
                      v === 1 ? 'on' : '',
                      v === 2 ? 'accent' : '',
                      i % 4 === 0 ? 'beat-start' : '',
                      isNow ? 'now' : '',
                    ].join(' ')}
                    onClick={() => cycleStep(lane, index)}
                    aria-label={`${DRUM_LANE_LABELS[lane]} step ${index + 1}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
