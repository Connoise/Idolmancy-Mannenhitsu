# Mannenhitsu — Pre-Development Questions

> **Mannenhitsu** (万年筆, "fountain pen") — a drafting tool for song structures:
> chord progressions and drum patterns arranged as blocks, exported to MIDI for
> further composition in a DAW. Targets: Windows 11 desktop + mobile.

Answer inline under each question (or in a reply); recommended defaults are
marked so "agree with the default" is a valid answer.

---

## Context from the Idolmancy suite

- **Idolmancer** is a Vite + React + TypeScript + Tailwind monorepo of music
  tools, wrapped in **Tauri v2** (Windows 11 now, Android planned), offline-first
  and strictly client-side. Each tool is a package exporting a headless core, a
  React component, and a manifest. Shared packages include `theory-core`
  (pitch/chord/scale/tempo math, unit-tested), `audio-engine`, `tokens`, and
  `storage`. Its **chordgen** tool already does chord playback (Tone.js) and
  MIDI export (`@tonejs/midi`).
- **Megane** is a standalone Python tool — a different "field" of the suite.

Mannenhitsu's requirements (chords, patterns, tempo math, MIDI export,
Win11 + mobile) overlap heavily with what Idolmancer already has.

---

## A. Platform & delivery

**1.** Should Mannenhitsu be built **inside the Idolmancer monorepo as a tool
package** (reusing `theory-core`, the shell, tokens, and the Tauri/Android
path), or as a **standalone repo/app** that merely follows the same stack?
*Recommended: build it as an Idolmancer tool (or at least in the same
monorepo as its own app) — you get the chord math, MIDI export plumbing, and
the desktop/mobile packaging story for free, and the suite stays cohesive.*

**2.** Idolmancer's Android (Tauri mobile) phase hasn't happened yet. For
mobile **today**, is an **installable PWA** (open a URL on your phone, "Add to
Home Screen", works offline) acceptable as the mobile delivery, with a native
Android wrapper later? Or do you need a native app from day one?

**3.** How should projects move between your phone and your PC? Options:
(a) manual — export/import a project file (e.g. share a `.json` via any channel),
(b) a synced folder you already use (Dropbox/Drive/OneDrive) that the app reads
from, (c) built-in cloud sync (requires a server — breaks the suite's
offline-first, no-server rule). *Recommended: (a) now, designed so (b) works
naturally.*

**4.** What mobile device/OS are you on (Android or iOS)? This decides whether
the Tauri-mobile path is even relevant (Tauri mobile supports both, but PWA
behavior and audio support differ notably on iOS Safari).

## B. Chords & the chord library

**5.** What should the chord library contain? e.g. per root (12 roots ×):
maj, min, dim, aug, sus2, sus4, 6, m6, 7, maj7, m7, m7♭5, 9, m9, add9, 11, 13…
Is there a set you actually use, or should it start small (triads + 7ths +
sus) and grow? (Idolmancer's `theory-core` already defines chord formulas —
reusing it would make the same chord names/spellings appear across the suite.)

**6.** With no inversions, all chords are root position. What default voicing
and register? e.g. chord tones stacked from **C3–C5**, optionally with the
root doubled an octave below as a bass note. Should the octave be adjustable
per pattern or per song?

**7.** Should chord selection be **key-aware** — pick a song key and get the
diatonic chords offered first (with everything else still reachable), like
chordgen does — or a flat, unfiltered library picker?

**8.** What is the **minimum chord duration** and grid? e.g. chords snap to a
half-bar grid (whole and half bars only), or down to quarter notes / 8th
notes? Can a single chord sustain across a bar line (e.g. a 6-beat chord)?

**9.** Chord progression patterns: what **bar lengths** should be allowed
(1–8 bars? powers of two only?), and what's the default (4 bars)? Do all
patterns in one song need the same length, or can a 2-bar loop sit next to a
4-bar one in the arrangement?

## C. Drum sequencer

**10.** Pattern length: fixed **1 bar = 16 steps**, or selectable 1/2/4 bars
(16/32/64 steps)? *Recommended: selectable, default 1 bar.*

**11.** Are steps pure **on/off toggles**, or do you want a simple **accent**
level per step (normal/accent, mapped to two velocities)? Plain toggles keep
the mobile UI simplest; accents make exported MIDI much more usable.

**12.** MIDI mapping for the drum lanes: is standard **General MIDI on channel
10** correct for your DAW workflow — Kick 36, Snare 38, Clap 39, Low Tom 45,
Closed Hat 42, Open Hat 46, Crash 49, High Tom 50, Cowbell 56? Or do you use a
specific drum plugin/kit whose mapping we should match (or make remappable in
settings)?

**13.** Any groove controls in v1 — **swing** (16th-note shuffle amount) or
per-lane volume? Or strictly straight 16ths for now?

## D. Song project & arrangement

**14.** Arrangement model: is a song a **single sequence of blocks**, where
each block = one chord pattern + one drum pattern playing together for N bars?
Or **two independent lanes** (a chord lane and a drum lane) where patterns are
placed separately and can overlap freely (e.g. same 1-bar drum loop under a
changing 4-bar progression)? *Recommended: two lanes — it matches how you'd
loop a drum pattern under longer progressions.*

**15.** When a pattern is placed multiple times in a song, is each placement a
**reference** (edit the pattern once, every placement updates) or a **copy**
(placements are independent)? *Recommended: references, with an explicit
"duplicate pattern" action when you want a variant.*

**16.** Do you want **section semantics** — labeling regions of the song
(Intro / Verse / Chorus / Bridge) and repeat counts — in v1, or is a flat
ordered sequence of blocks enough to start?

## E. Playback, export, persistence

**17.** Is **in-app playback** needed for v1 (audition chords with a simple
piano/pad sound and drums with basic samples, Tone.js style, with a play/loop
transport), or is Mannenhitsu purely visual drafting where the DAW does all
listening? Playback is a significant chunk of the work, so this strongly
shapes the v1 scope. *Assumption if unanswered: yes, basic playback — a
sketchpad you can't hear is hard to use on the couch.*

**18.** MIDI export shape: one **multi-track MIDI file** (Type 1) per song —
track 1 chords, track 2 drums (ch. 10), with tempo and 4/4 time signature
embedded? Should individual patterns also be exportable as small `.mid` files
for drag-and-drop into a DAW? Which DAW(s) should exports be verified against
(FL Studio / Ableton / Reaper / Cubase / other)?

**19.** Project persistence: projects saved **inside the app** (a project list
in app storage, with export-to-file as a share/backup action), or **as files**
you manage directly (open/save `.json`)? And should the app autosave the
working project?

## F. Scope & roadmap

**20.** Beyond the stated "other time signatures later": what else should the
data model anticipate now, even if the UI comes later — per-section tempo
changes, a bass/melody lane, per-step velocity, humanization, MIDI *import*?
(Anticipating these in the project file format is cheap now and painful
later.)

---

## On the name

Suite naming so far uses Japanese **object** names: Megane (眼鏡, glasses),
Mannenhitsu (万年筆, fountain pen). Keeping the object-name convention is
cohesive, and "fountain pen for drafting songs" is a strong metaphor —
**keeping Mannenhitsu is a good choice**. (Note the romanization: 万年筆 is
*mannenhitsu* — "man-nen-hitsu", ten-thousand-year brush — matching the repo
name; the task description's "Mannehitsu" drops an *n*.)

If a name closer to the *function* is preferred:

- **Shitagaki** (下書き) — "rough draft / sketch"; the most literal match for
  "drafting song structures".
- **Sōkō** (草稿) — "manuscript draft".
- **Nēmu** / **Ename** (ネーム) — the manga term for the rough panel layout
  drafted before drawing; niche but evocative of blocking out structure.

Recommendation: keep **Mannenhitsu**.
