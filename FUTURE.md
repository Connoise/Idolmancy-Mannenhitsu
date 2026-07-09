# Mannenhitsu — Future Development Notes

This build is the **mobile-first drafting version**: a standalone, offline-capable
web app for sketching songs away from the studio PC. This file records what was
deliberately deferred, for the full production development inside the Idolmancy
suite.

## Planned future functions (from project owner, 2026-07)

- Tempo changes (per section / mid-song)
- Melody and bass lines (new lanes alongside chords and drums)
- Selectable chord inversions
- Finer chord subdivisions (below quarter notes)
- Modal chord suggestions (beyond major/natural minor diatonic)
- MIDI import
- Additional time signatures (only 4/4 now; the project file already stores
  `timeSignature` so files stay forward-compatible)
- Swing / shuffle for the drum sequencer
- Per-lane drum volume; velocity beyond the two-level normal/accent

## Integration into Idolmancer

Idolmancer (the suite's workbench app) is a Vite + React + TS + Tailwind
monorepo where each tool ships as a package exporting **(1) a headless core,
(2) a default React component, (3) a manifest**, wrapped by Tauri v2 for
Windows 11 with a planned Android path.

Mannenhitsu was intentionally built to match that shape:

- `src/core/` is framework-free TypeScript (theory, MIDI writer, Web Audio
  engine, project model) with unit tests — it can move into or sit beside
  `@idolmancer/theory-core`. Chord formulas/naming should be reconciled with
  theory-core's so chord names match across the suite.
- `src/ui/` is a self-contained React tree with plain CSS — porting means
  re-skinning with the suite's Tailwind tokens and exporting `App` as the
  tool component plus a manifest.
- The project file format (`*.mannenhitsu.json`, `version: 1`) should be kept
  readable by the suite version so drafts made on the phone open in the studio.
- Like chordgen, the tool could publish its key/tempo to Idolmancer's shared
  selection store.

## Known v1 limitations / notes

- Drum block names truncate hard on 1-bar blocks in the song timeline (44 px).
- PWA icon is SVG-only; some Android versions prefer PNG icons for install.
- `pickFile` (Load) uses a transient `<input type=file>`; there is no
  File System Access API integration.
- localStorage keeps the working project as a crash safety net; files are the
  canonical save format (no autosave by design).
