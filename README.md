# Mannenhitsu 万年筆

**Mannenhitsu** ("fountain pen") is a song-drafting tool in the **Idolmancy**
field: sketch chord progressions and drum patterns as reusable blocks, arrange
them into a song, hear it, and export a multi-track MIDI file to finish the
composition in a DAW (Reaper with virtual instruments is the reference target).

It is a **mobile-first, offline-capable web app** — built to be used on an
Android phone (e.g. served from your home PC over Tailscale) or in any desktop
browser. No server, no accounts; projects are local files.

> Planning history: [PLANNING-QUESTIONS.md](./PLANNING-QUESTIONS.md).
> Deferred features and the path into the Idolmancer suite: [FUTURE.md](./FUTURE.md).

## Features

- **Chord patterns** — 1/2/4-bar progressions on a quarter-note grid (chords
  never cross bar lines). Chord library: triads (maj/min/dim/aug), sus2/sus4,
  6ths, 7ths (incl. m7♭5, dim7), 9/maj9/m9/add9, 11, 13 — root position,
  stacked from the root, selectable octave. Pick a song key to get the
  diatonic I–VII chords (triads or 7ths) as one-tap suggestions; the full
  root × quality picker is always available.
- **Drum patterns** — 16th-note step sequencer, 1/2/4 bars, nine lanes
  (kick, snare, clap, closed/open hat, crash, cowbell, high/low tom), steps
  cycle off → on → accent.
- **Song arrangement** — two independent lanes (chords / drums) on a bar
  timeline; patterns are placed by **reference** (edit once, updates
  everywhere; duplicate to make variants), gaps are allowed in either lane,
  and sections can be labeled (Intro, Verse, …). One tempo, 4/4.
- **Playback** — built-in Web Audio piano and drum sounds; audition patterns
  in their editors (looped) or play the whole song with a timeline playhead.
- **MIDI export** — one format-1 `.mid` per song: conductor track (tempo,
  4/4, section markers), chord track (piano, ch 1), drum track (ch 10,
  standard General MIDI mapping), 480 PPQ.
- **Projects** — save/load as standalone `.mannenhitsu.json` files; the
  working project also survives page reloads via localStorage.

## Run it

Requires Node ≥ 20.

```bash
npm install
npm run dev        # http://localhost:5173, listens on all interfaces
```

`npm run dev` binds to `0.0.0.0`, so a phone on the same LAN/tailnet can open
`http://<machine-or-tailscale-name>:5173` directly.

Production build:

```bash
npm run build      # typecheck + build → dist/
npm run preview    # serve dist/ locally
```

`dist/` is a fully static site (relative paths) — host it with any static file
server on your home machine and open it over Tailscale, e.g.:

```bash
npx serve dist            # or: python -m http.server -d dist 8000
```

After the first visit the service worker keeps the app working offline, and
Chrome on Android offers "Add to Home Screen" for an app-like install.

```bash
npm test           # vitest: music theory + MIDI encoding
npm run typecheck
```

## Layout

```
src/core/    headless TypeScript: types, theory (chords/keys), events,
             Web Audio engine, MIDI writer, project model  (unit-tested)
src/ui/      React components: song timeline, chord editor + picker,
             drum sequencer, state reducer
public/      PWA manifest, icon, service worker
```

The core/UI split mirrors the Idolmancer suite's tool convention (headless
core + React view) so Mannenhitsu can later be imported into the suite —
see [FUTURE.md](./FUTURE.md).
