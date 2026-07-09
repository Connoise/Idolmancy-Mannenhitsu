import { useMemo, useState } from 'react';
import { songEvents } from '../core/events';
import { exportSongMidi } from '../core/midi';
import {
  nextFreeBar, placementEnd, placementOverlaps, songLengthBars,
} from '../core/project';
import { NOTE_NAMES } from '../core/theory';
import { BEATS_PER_BAR, type Placement, type Project } from '../core/types';
import { downloadBlob, safeFilename } from './files';
import { Modal } from './Modal';
import type { Action, LaneId } from './state';
import { usePlayback } from './usePlayback';

const BAR_WIDTH = 44;

interface AddState { lane: LaneId }
interface EditState { lane: LaneId; placement: Placement }
interface SectionState { id: string | null; name: string; startBar: number }

export function SongTab({ project, dispatch }: {
  project: Project;
  dispatch: (a: Action) => void;
}) {
  const { playing, beat, play, stop } = usePlayback();
  const [adding, setAdding] = useState<AddState | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [sectionEdit, setSectionEdit] = useState<SectionState | null>(null);

  const lengthBars = songLengthBars(project);
  const timelineBars = Math.max(lengthBars + 2, 8);
  const canPlay = lengthBars > 0;

  const seq = useMemo(() => songEvents(project), [project]);

  const exportMidi = () => {
    const bytes = exportSongMidi(project);
    downloadBlob(`${safeFilename(project.name)}.mid`, new Blob([bytes], { type: 'audio/midi' }));
  };

  const patternName = (lane: LaneId, patternId: string): string => {
    const list = lane === 'chordLane' ? project.chordPatterns : project.drumPatterns;
    return list.find((p) => p.id === patternId)?.name ?? '?';
  };

  return (
    <div className="song-tab">
      <div className="song-controls">
        <label className="field">
          <span className="picker-label">Tempo</span>
          <div className="tempo-row">
            <button className="btn icon" onClick={() => dispatch({ type: 'setTempo', tempo: project.tempo - 1 })}>−</button>
            <input
              className="tempo-input"
              type="number"
              inputMode="numeric"
              min={20}
              max={300}
              value={project.tempo}
              onChange={(e) => dispatch({ type: 'setTempo', tempo: Number(e.target.value) })}
            />
            <button className="btn icon" onClick={() => dispatch({ type: 'setTempo', tempo: project.tempo + 1 })}>+</button>
            <span className="hint">BPM · 4/4</span>
          </div>
        </label>
        <label className="field">
          <span className="picker-label">Key (for chord suggestions)</span>
          <div className="key-row">
            <select
              value={project.key ? String(project.key.tonic) : ''}
              onChange={(e) => {
                const v = e.target.value;
                dispatch({
                  type: 'setKey',
                  key: v === '' ? null : { tonic: Number(v), mode: project.key?.mode ?? 'major' },
                });
              }}
            >
              <option value="">None</option>
              {NOTE_NAMES.map((n, i) => (
                <option key={n} value={i}>{n}</option>
              ))}
            </select>
            <select
              value={project.key?.mode ?? 'major'}
              disabled={!project.key}
              onChange={(e) =>
                project.key &&
                dispatch({ type: 'setKey', key: { ...project.key, mode: e.target.value as 'major' | 'minor' } })
              }
            >
              <option value="major">major</option>
              <option value="minor">minor</option>
            </select>
          </div>
        </label>
      </div>

      <div className="transport">
        <button
          className={`btn ${playing ? 'danger' : 'primary'}`}
          disabled={!canPlay && !playing}
          onClick={() => (playing ? stop() : play(seq, project.tempo, false))}
        >
          {playing ? '■ Stop' : '▶ Play song'}
        </button>
        <button className="btn" disabled={!canPlay} onClick={exportMidi}>⬇ Export MIDI</button>
        <span className="hint">{lengthBars} bar{lengthBars === 1 ? '' : 's'}</span>
      </div>

      <div className="timeline-wrap">
        <div className="timeline" style={{ width: 84 + timelineBars * BAR_WIDTH }}>
          <div className="tl-row tl-sections">
            <div className="tl-lane-label">
              <button className="btn small" onClick={() => setSectionEdit({ id: null, name: '', startBar: 0 })}>
                + Label
              </button>
            </div>
            <div className="tl-cells" style={{ gridTemplateColumns: `repeat(${timelineBars}, ${BAR_WIDTH}px)` }}>
              {project.sections.map((s) =>
                s.startBar < timelineBars ? (
                  <button
                    key={s.id}
                    className="tl-section"
                    style={{ gridColumn: `${s.startBar + 1} / span 2`, gridRow: 1 }}
                    onClick={() => setSectionEdit({ id: s.id, name: s.name, startBar: s.startBar })}
                  >
                    {s.name}
                  </button>
                ) : null
              )}
            </div>
          </div>

          <div className="tl-row tl-ruler">
            <div className="tl-lane-label" />
            <div className="tl-cells" style={{ gridTemplateColumns: `repeat(${timelineBars}, ${BAR_WIDTH}px)` }}>
              {Array.from({ length: timelineBars }, (_, i) => (
                <span key={i} className="tl-barnum">{i + 1}</span>
              ))}
            </div>
          </div>

          {(['chordLane', 'drumLane'] as const).map((lane) => (
            <div key={lane} className="tl-row tl-lane">
              <div className="tl-lane-label">
                <span>{lane === 'chordLane' ? 'Chords' : 'Drums'}</span>
                <button className="btn icon" title="Add to lane" onClick={() => setAdding({ lane })}>＋</button>
              </div>
              <div
                className="tl-cells tl-blocks"
                style={{ gridTemplateColumns: `repeat(${timelineBars}, ${BAR_WIDTH}px)` }}
              >
                {project.arrangement[lane].map((pl) => (
                  <button
                    key={pl.id}
                    className={`tl-block ${lane === 'chordLane' ? 'chord' : 'drum'}`}
                    style={{
                      gridColumn: `${pl.startBar + 1} / span ${placementEnd(project, lane, pl) - pl.startBar}`,
                      gridRow: 1,
                    }}
                    onClick={() => setEditing({ lane, placement: pl })}
                  >
                    {patternName(lane, pl.patternId)}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {playing && (
            <div className="tl-playhead" style={{ left: 84 + (beat / BEATS_PER_BAR) * BAR_WIDTH }} />
          )}
        </div>
      </div>

      {adding && (
        <AddPlacementModal
          project={project}
          lane={adding.lane}
          onClose={() => setAdding(null)}
          onAdd={(patternId, startBar) => {
            dispatch({ type: 'addPlacement', lane: adding.lane, patternId, startBar });
            setAdding(null);
          }}
        />
      )}

      {editing && (
        <EditPlacementModal
          project={project}
          lane={editing.lane}
          placement={editing.placement}
          onClose={() => setEditing(null)}
          onMove={(startBar) => {
            dispatch({ type: 'movePlacement', lane: editing.lane, id: editing.placement.id, startBar });
            setEditing(null);
          }}
          onDelete={() => {
            dispatch({ type: 'deletePlacement', lane: editing.lane, id: editing.placement.id });
            setEditing(null);
          }}
        />
      )}

      {sectionEdit && (
        <Modal title={sectionEdit.id ? 'Edit label' : 'Add label'} onClose={() => setSectionEdit(null)}>
          <label className="field">
            <span className="picker-label">Name</span>
            <input
              value={sectionEdit.name}
              onChange={(e) => setSectionEdit({ ...sectionEdit, name: e.target.value })}
              placeholder="Verse, Chorus…"
            />
          </label>
          <label className="field">
            <span className="picker-label">Starts at bar</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={sectionEdit.startBar + 1}
              onChange={(e) =>
                setSectionEdit({ ...sectionEdit, startBar: Math.max(0, Number(e.target.value) - 1) })
              }
            />
          </label>
          <div className="modal-actions">
            {sectionEdit.id && (
              <button
                className="btn danger"
                onClick={() => {
                  dispatch({ type: 'deleteSection', id: sectionEdit.id! });
                  setSectionEdit(null);
                }}
              >
                Delete
              </button>
            )}
            <button
              className="btn primary"
              disabled={!sectionEdit.name.trim()}
              onClick={() => {
                if (sectionEdit.id) {
                  dispatch({
                    type: 'updateSection',
                    section: { id: sectionEdit.id, name: sectionEdit.name.trim(), startBar: sectionEdit.startBar },
                  });
                } else {
                  dispatch({ type: 'addSection', name: sectionEdit.name.trim(), startBar: sectionEdit.startBar });
                }
                setSectionEdit(null);
              }}
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddPlacementModal({ project, lane, onAdd, onClose }: {
  project: Project;
  lane: LaneId;
  onAdd: (patternId: string, startBar: number) => void;
  onClose: () => void;
}) {
  const patterns = lane === 'chordLane' ? project.chordPatterns : project.drumPatterns;
  const [patternId, setPatternId] = useState(patterns[0]?.id ?? '');
  const [startBar, setStartBar] = useState(nextFreeBar(project, lane));
  const overlap = patternId !== '' && placementOverlaps(project, lane, patternId, startBar);

  return (
    <Modal title={`Add ${lane === 'chordLane' ? 'chord' : 'drum'} pattern to song`} onClose={onClose}>
      {patterns.length === 0 ? (
        <p className="empty-hint">
          No {lane === 'chordLane' ? 'chord' : 'drum'} patterns yet — create one in the{' '}
          {lane === 'chordLane' ? 'Chords' : 'Drums'} tab first.
        </p>
      ) : (
        <>
          <label className="field">
            <span className="picker-label">Pattern</span>
            <select value={patternId} onChange={(e) => setPatternId(e.target.value)}>
              {patterns.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.bars} bar{p.bars > 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="picker-label">Starts at bar</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={startBar + 1}
              onChange={(e) => setStartBar(Math.max(0, Number(e.target.value) - 1))}
            />
          </label>
          {overlap && <p className="warn">Overlaps another pattern in this lane.</p>}
          <div className="modal-actions">
            <button
              className="btn primary"
              disabled={!patternId || overlap}
              onClick={() => onAdd(patternId, startBar)}
            >
              Add
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function EditPlacementModal({ project, lane, placement, onMove, onDelete, onClose }: {
  project: Project;
  lane: LaneId;
  placement: Placement;
  onMove: (startBar: number) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [startBar, setStartBar] = useState(placement.startBar);
  const overlap = placementOverlaps(project, lane, placement.patternId, startBar, placement.id);
  const list = lane === 'chordLane' ? project.chordPatterns : project.drumPatterns;
  const name = list.find((p) => p.id === placement.patternId)?.name ?? '?';

  return (
    <Modal title={`"${name}" in song`} onClose={onClose}>
      <label className="field">
        <span className="picker-label">Starts at bar</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={startBar + 1}
          onChange={(e) => setStartBar(Math.max(0, Number(e.target.value) - 1))}
        />
      </label>
      {overlap && <p className="warn">Overlaps another pattern in this lane.</p>}
      <div className="modal-actions">
        <button className="btn danger" onClick={onDelete}>Remove from song</button>
        <button className="btn primary" disabled={overlap} onClick={() => onMove(startBar)}>
          Apply
        </button>
      </div>
    </Modal>
  );
}
