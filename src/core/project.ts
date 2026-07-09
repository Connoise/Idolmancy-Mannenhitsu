import {
  BEATS_PER_BAR, DRUM_LANES, STEPS_PER_BAR,
  type ChordPattern, type DrumPattern, type DrumLane, type Placement,
  type Project, type StepValue,
} from './types';

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newProject(): Project {
  return {
    version: 1,
    name: 'Untitled Song',
    tempo: 120,
    timeSignature: [4, 4],
    key: null,
    chordPatterns: [],
    drumPatterns: [],
    arrangement: { chordLane: [], drumLane: [] },
    sections: [],
  };
}

export function emptySteps(bars: number): Record<DrumLane, StepValue[]> {
  const steps = {} as Record<DrumLane, StepValue[]>;
  for (const lane of DRUM_LANES) steps[lane] = new Array(bars * STEPS_PER_BAR).fill(0);
  return steps;
}

export function newChordPattern(name: string): ChordPattern {
  return { id: uid('cp'), name, bars: 4, chords: [] };
}

export function newDrumPattern(name: string): DrumPattern {
  return { id: uid('dp'), name, bars: 1, steps: emptySteps(1) };
}

/** Resize a drum pattern, preserving existing steps (truncate or pad with 0). */
export function resizeDrumSteps(
  steps: Record<DrumLane, StepValue[]>,
  bars: number
): Record<DrumLane, StepValue[]> {
  const out = {} as Record<DrumLane, StepValue[]>;
  const len = bars * STEPS_PER_BAR;
  for (const lane of DRUM_LANES) {
    const src = steps[lane] ?? [];
    out[lane] = Array.from({ length: len }, (_, i) => src[i] ?? 0);
  }
  return out;
}

export function patternBars(project: Project, lane: 'chordLane' | 'drumLane', patternId: string): number {
  const list: { id: string; bars: number }[] =
    lane === 'chordLane' ? project.chordPatterns : project.drumPatterns;
  return list.find((p) => p.id === patternId)?.bars ?? 1;
}

export function placementEnd(project: Project, lane: 'chordLane' | 'drumLane', pl: Placement): number {
  return pl.startBar + patternBars(project, lane, pl.patternId);
}

/** Total song length in bars (end of the last placement in either lane). */
export function songLengthBars(project: Project): number {
  let end = 0;
  for (const pl of project.arrangement.chordLane) end = Math.max(end, placementEnd(project, 'chordLane', pl));
  for (const pl of project.arrangement.drumLane) end = Math.max(end, placementEnd(project, 'drumLane', pl));
  return end;
}

/** True if placing `patternId` at `startBar` would overlap an existing placement in the lane. */
export function placementOverlaps(
  project: Project,
  lane: 'chordLane' | 'drumLane',
  patternId: string,
  startBar: number,
  ignorePlacementId?: string
): boolean {
  const bars = patternBars(project, lane, patternId);
  return project.arrangement[lane].some((pl) => {
    if (pl.id === ignorePlacementId) return false;
    const s = pl.startBar;
    const e = placementEnd(project, lane, pl);
    return startBar < e && startBar + bars > s;
  });
}

/** First bar at/after the end of the lane's last placement — the natural "append here" spot. */
export function nextFreeBar(project: Project, lane: 'chordLane' | 'drumLane'): number {
  let end = 0;
  for (const pl of project.arrangement[lane]) end = Math.max(end, placementEnd(project, lane, pl));
  return end;
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): Project {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || data.version !== 1) {
    throw new Error('Not a Mannenhitsu v1 project file.');
  }
  if (!Array.isArray(data.chordPatterns) || !Array.isArray(data.drumPatterns) || !data.arrangement) {
    throw new Error('Project file is missing required fields.');
  }
  // Ensure drum step arrays match their declared bar counts.
  for (const dp of data.drumPatterns) dp.steps = resizeDrumSteps(dp.steps ?? {}, dp.bars);
  data.sections ??= [];
  data.timeSignature ??= [4, 4];
  return data as Project;
}

export { BEATS_PER_BAR, STEPS_PER_BAR };
