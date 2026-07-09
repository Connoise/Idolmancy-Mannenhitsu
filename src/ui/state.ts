import { newChordPattern, newDrumPattern, uid } from '../core/project';
import type {
  ChordPattern, DrumPattern, KeySelection, Project, SectionLabel,
} from '../core/types';

export type LaneId = 'chordLane' | 'drumLane';

export type Action =
  | { type: 'load'; project: Project }
  | { type: 'setName'; name: string }
  | { type: 'setTempo'; tempo: number }
  | { type: 'setKey'; key: KeySelection | null }
  | { type: 'upsertChordPattern'; pattern: ChordPattern }
  | { type: 'deleteChordPattern'; id: string }
  | { type: 'duplicateChordPattern'; id: string }
  | { type: 'upsertDrumPattern'; pattern: DrumPattern }
  | { type: 'deleteDrumPattern'; id: string }
  | { type: 'duplicateDrumPattern'; id: string }
  | { type: 'addPlacement'; lane: LaneId; patternId: string; startBar: number }
  | { type: 'movePlacement'; lane: LaneId; id: string; startBar: number }
  | { type: 'deletePlacement'; lane: LaneId; id: string }
  | { type: 'addSection'; name: string; startBar: number }
  | { type: 'updateSection'; section: SectionLabel }
  | { type: 'deleteSection'; id: string };

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return [...list, item];
  const out = [...list];
  out[i] = item;
  return out;
}

export function projectReducer(p: Project, a: Action): Project {
  switch (a.type) {
    case 'load':
      return a.project;
    case 'setName':
      return { ...p, name: a.name };
    case 'setTempo':
      return { ...p, tempo: Math.min(300, Math.max(20, Math.round(a.tempo) || 120)) };
    case 'setKey':
      return { ...p, key: a.key };

    case 'upsertChordPattern':
      return { ...p, chordPatterns: upsert(p.chordPatterns, a.pattern) };
    case 'deleteChordPattern':
      return {
        ...p,
        chordPatterns: p.chordPatterns.filter((x) => x.id !== a.id),
        arrangement: {
          ...p.arrangement,
          chordLane: p.arrangement.chordLane.filter((pl) => pl.patternId !== a.id),
        },
      };
    case 'duplicateChordPattern': {
      const src = p.chordPatterns.find((x) => x.id === a.id);
      if (!src) return p;
      const copy: ChordPattern = {
        ...src,
        id: newChordPattern('').id,
        name: `${src.name} copy`,
        chords: src.chords.map((c) => ({ ...c })),
      };
      return { ...p, chordPatterns: [...p.chordPatterns, copy] };
    }

    case 'upsertDrumPattern':
      return { ...p, drumPatterns: upsert(p.drumPatterns, a.pattern) };
    case 'deleteDrumPattern':
      return {
        ...p,
        drumPatterns: p.drumPatterns.filter((x) => x.id !== a.id),
        arrangement: {
          ...p.arrangement,
          drumLane: p.arrangement.drumLane.filter((pl) => pl.patternId !== a.id),
        },
      };
    case 'duplicateDrumPattern': {
      const src = p.drumPatterns.find((x) => x.id === a.id);
      if (!src) return p;
      const steps = {} as DrumPattern['steps'];
      for (const lane of Object.keys(src.steps) as (keyof DrumPattern['steps'])[]) {
        steps[lane] = [...src.steps[lane]];
      }
      const copy: DrumPattern = { ...src, id: newDrumPattern('').id, name: `${src.name} copy`, steps };
      return { ...p, drumPatterns: [...p.drumPatterns, copy] };
    }

    case 'addPlacement':
      return {
        ...p,
        arrangement: {
          ...p.arrangement,
          [a.lane]: [
            ...p.arrangement[a.lane],
            { id: uid('pl'), patternId: a.patternId, startBar: a.startBar },
          ],
        },
      };
    case 'movePlacement':
      return {
        ...p,
        arrangement: {
          ...p.arrangement,
          [a.lane]: p.arrangement[a.lane].map((pl) =>
            pl.id === a.id ? { ...pl, startBar: a.startBar } : pl
          ),
        },
      };
    case 'deletePlacement':
      return {
        ...p,
        arrangement: {
          ...p.arrangement,
          [a.lane]: p.arrangement[a.lane].filter((pl) => pl.id !== a.id),
        },
      };

    case 'addSection':
      return { ...p, sections: [...p.sections, { id: uid('sec'), name: a.name, startBar: a.startBar }] };
    case 'updateSection':
      return { ...p, sections: upsert(p.sections, a.section) };
    case 'deleteSection':
      return { ...p, sections: p.sections.filter((s) => s.id !== a.id) };
  }
}
