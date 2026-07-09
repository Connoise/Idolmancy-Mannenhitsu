import { useState } from 'react';
import { audioEngine } from '../core/audio';
import {
  CHORD_QUALITIES, NOTE_NAMES, chordMidiNotes, chordName, diatonicChords,
} from '../core/theory';
import type { ChordEvent, ChordQualityId, KeySelection, PitchClass } from '../core/types';
import { Modal } from './Modal';

const GROUPS: { label: string; ids: ChordQualityId[] }[] = [
  { label: 'Triads', ids: ['maj', 'min', 'dim', 'aug'] },
  { label: 'Sus', ids: ['sus2', 'sus4'] },
  { label: '6ths', ids: ['6', 'm6'] },
  { label: '7ths', ids: ['7', 'maj7', 'm7', 'm7b5', 'dim7'] },
  { label: 'Extended', ids: ['9', 'maj9', 'm9', 'add9', '11', 'm11', '13', 'm13'] },
];

export interface ChordPickerResult {
  root: PitchClass;
  quality: ChordQualityId;
  octave: number;
  durationBeats: number;
}

export function ChordPicker({ initial, maxDuration, songKey, isEdit, onApply, onDelete, onClose }: {
  initial: Omit<ChordEvent, 'startBeat'>;
  maxDuration: number;
  songKey: KeySelection | null;
  isEdit: boolean;
  onApply: (result: ChordPickerResult) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [root, setRoot] = useState<PitchClass>(initial.root);
  const [qual, setQual] = useState<ChordQualityId>(initial.quality);
  const [octave, setOctave] = useState(initial.octave);
  const [duration, setDuration] = useState(Math.min(initial.durationBeats, maxDuration));
  const [sevenths, setSevenths] = useState(false);

  const preview = (r: PitchClass, q: ChordQualityId, o: number) => {
    audioEngine.previewNotes(chordMidiNotes(r, q, o));
  };

  const pick = (r: PitchClass, q: ChordQualityId) => {
    setRoot(r);
    setQual(q);
    preview(r, q, octave);
  };

  return (
    <Modal title={isEdit ? 'Edit chord' : 'Add chord'} onClose={onClose}>
      <div className="picker-current">
        <span className="picker-chord-name">{chordName(root, qual)}</span>
        <button className="btn small" onClick={() => preview(root, qual, octave)}>🔊 Hear</button>
      </div>

      {songKey && (
        <div className="picker-section">
          <div className="picker-label-row">
            <span className="picker-label">In key ({NOTE_NAMES[songKey.tonic]} {songKey.mode})</span>
            <label className="check">
              <input type="checkbox" checked={sevenths} onChange={(e) => setSevenths(e.target.checked)} />
              7ths
            </label>
          </div>
          <div className="chip-row">
            {diatonicChords(songKey, sevenths).map((c) => (
              <button
                key={c.numeral}
                className={`chip ${c.root === root && c.quality === qual ? 'active' : ''}`}
                onClick={() => pick(c.root, c.quality)}
              >
                <span className="chip-numeral">{c.numeral}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="picker-section">
        <span className="picker-label">Root</span>
        <div className="root-grid">
          {NOTE_NAMES.map((n, i) => (
            <button key={n} className={`cellbtn ${i === root ? 'active' : ''}`} onClick={() => pick(i, qual)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="picker-section">
        <span className="picker-label">Quality</span>
        {GROUPS.map((g) => (
          <div key={g.label} className="quality-group">
            <span className="quality-group-label">{g.label}</span>
            <div className="chip-row">
              {g.ids.map((id) => {
                const q = CHORD_QUALITIES.find((x) => x.id === id)!;
                return (
                  <button
                    key={id}
                    className={`chip ${id === qual ? 'active' : ''}`}
                    onClick={() => pick(root, id)}
                  >
                    {q.suffix || 'maj'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="picker-section picker-inline">
        <div>
          <span className="picker-label">Length (beats)</span>
          <div className="chip-row">
            {Array.from({ length: maxDuration }, (_, i) => i + 1).map((d) => (
              <button key={d} className={`chip ${d === duration ? 'active' : ''}`} onClick={() => setDuration(d)}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="picker-label">Octave</span>
          <div className="chip-row">
            {[2, 3, 4, 5].map((o) => (
              <button
                key={o}
                className={`chip ${o === octave ? 'active' : ''}`}
                onClick={() => { setOctave(o); preview(root, qual, o); }}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        {isEdit && onDelete && (
          <button className="btn danger" onClick={onDelete}>Delete</button>
        )}
        <button
          className="btn primary"
          onClick={() => onApply({ root, quality: qual, octave, durationBeats: duration })}
        >
          {isEdit ? 'Apply' : 'Add'}
        </button>
      </div>
    </Modal>
  );
}
