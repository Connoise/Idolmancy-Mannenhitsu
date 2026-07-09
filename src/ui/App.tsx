import { useEffect, useReducer, useState } from 'react';
import { chordEventName } from '../core/theory';
import {
  deserializeProject, newChordPattern, newDrumPattern, newProject, serializeProject,
} from '../core/project';
import type { Project } from '../core/types';
import { ChordPatternEditor } from './ChordPatternEditor';
import { DrumPatternEditor } from './DrumPatternEditor';
import { downloadBlob, pickFile, safeFilename } from './files';
import { PatternList } from './PatternList';
import { SongTab } from './SongTab';
import { projectReducer } from './state';

type Tab = 'song' | 'chords' | 'drums';

const STORAGE_KEY = 'mannenhitsu.project';

function initialProject(): Project {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return deserializeProject(saved);
  } catch {
    // fall through to a fresh project
  }
  return newProject();
}

export function App() {
  const [project, dispatch] = useReducer(projectReducer, undefined, initialProject);
  const [tab, setTab] = useState<Tab>('song');
  const [openChordId, setOpenChordId] = useState<string | null>(null);
  const [openDrumId, setOpenDrumId] = useState<string | null>(null);

  // Keep the working project in localStorage so a killed mobile tab loses nothing.
  // Project *files* (save/load buttons) remain the canonical storage.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serializeProject(project));
    } catch {
      // storage full/unavailable — file save still works
    }
  }, [project]);

  const saveFile = () => {
    downloadBlob(
      `${safeFilename(project.name)}.mannenhitsu.json`,
      new Blob([serializeProject(project)], { type: 'application/json' })
    );
  };

  const loadFile = async () => {
    const file = await pickFile('.json,application/json');
    if (!file) return;
    try {
      dispatch({ type: 'load', project: deserializeProject(await file.text()) });
      setTab('song');
    } catch (err) {
      alert(`Could not load project: ${err instanceof Error ? err.message : err}`);
    }
  };

  const newSong = () => {
    if (window.confirm('Start a new song? Unsaved changes to the current song are lost.')) {
      dispatch({ type: 'load', project: newProject() });
      setOpenChordId(null);
      setOpenDrumId(null);
      setTab('song');
    }
  };

  const openChord = openChordId ? project.chordPatterns.find((p) => p.id === openChordId) : null;
  const openDrum = openDrumId ? project.drumPatterns.find((p) => p.id === openDrumId) : null;

  const usedChordIds = new Set(project.arrangement.chordLane.map((pl) => pl.patternId));
  const usedDrumIds = new Set(project.arrangement.drumLane.map((pl) => pl.patternId));

  return (
    <div className="app">
      <header className="topbar">
        <span className="logo" title="Mannenhitsu">万</span>
        <input
          className="name-input project-name"
          value={project.name}
          onChange={(e) => dispatch({ type: 'setName', name: e.target.value })}
          aria-label="Song name"
        />
        <div className="topbar-actions">
          <button className="btn small" onClick={newSong}>New</button>
          <button className="btn small" onClick={saveFile}>Save</button>
          <button className="btn small" onClick={loadFile}>Load</button>
        </div>
      </header>

      <main className="content">
        {tab === 'song' && <SongTab project={project} dispatch={dispatch} />}

        {tab === 'chords' &&
          (openChord ? (
            <ChordPatternEditor
              project={project}
              pattern={openChord}
              onChange={(pattern) => dispatch({ type: 'upsertChordPattern', pattern })}
              onBack={() => setOpenChordId(null)}
            />
          ) : (
            <PatternList
              items={project.chordPatterns.map((p) => ({
                id: p.id,
                name: p.name,
                bars: p.bars,
                detail: p.chords.length
                  ? p.chords.slice(0, 6).map(chordEventName).join(' · ') + (p.chords.length > 6 ? ' …' : '')
                  : 'empty',
                inUse: usedChordIds.has(p.id),
              }))}
              emptyHint="No chord patterns yet. Create one and tap beats to place chords."
              onNew={() => {
                const pattern = newChordPattern(`Progression ${project.chordPatterns.length + 1}`);
                dispatch({ type: 'upsertChordPattern', pattern });
                setOpenChordId(pattern.id);
              }}
              onOpen={setOpenChordId}
              onDuplicate={(id) => dispatch({ type: 'duplicateChordPattern', id })}
              onDelete={(id) => dispatch({ type: 'deleteChordPattern', id })}
            />
          ))}

        {tab === 'drums' &&
          (openDrum ? (
            <DrumPatternEditor
              project={project}
              pattern={openDrum}
              onChange={(pattern) => dispatch({ type: 'upsertDrumPattern', pattern })}
              onBack={() => setOpenDrumId(null)}
            />
          ) : (
            <PatternList
              items={project.drumPatterns.map((p) => {
                const hits = Object.values(p.steps).reduce(
                  (n, lane) => n + lane.filter(Boolean).length,
                  0
                );
                return {
                  id: p.id,
                  name: p.name,
                  bars: p.bars,
                  detail: hits ? `${hits} hits` : 'empty',
                  inUse: usedDrumIds.has(p.id),
                };
              })}
              emptyHint="No drum patterns yet. Create one and tap steps to build a beat."
              onNew={() => {
                const pattern = newDrumPattern(`Beat ${project.drumPatterns.length + 1}`);
                dispatch({ type: 'upsertDrumPattern', pattern });
                setOpenDrumId(pattern.id);
              }}
              onOpen={setOpenDrumId}
              onDuplicate={(id) => dispatch({ type: 'duplicateDrumPattern', id })}
              onDelete={(id) => dispatch({ type: 'deleteDrumPattern', id })}
            />
          ))}
      </main>

      <nav className="tabbar">
        {(
          [
            ['song', '🏠', 'Song'],
            ['chords', '🎹', 'Chords'],
            ['drums', '🥁', 'Drums'],
          ] as const
        ).map(([id, icon, label]) => (
          <button
            key={id}
            className={`tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            <span className="tab-icon">{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
