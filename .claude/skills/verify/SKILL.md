---
name: verify
description: Build, launch, and drive Mannenhitsu (Vite + React web app) to verify changes at the UI surface.
---

# Verifying Mannenhitsu

## Build & serve

```bash
npm install --no-audit --no-fund
npm run build                 # tsc --noEmit + vite build → dist/
npx vite preview --port 4173  # serve the production build
```

## Drive (headless Chromium via playwright-core)

Chromium lives at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` in the
remote environment (check the exact `chromium-*` dir). `playwright-core` is a
dev dependency. In an `.mjs` script outside the repo, import it by file URL:

```js
import { chromium } from 'file:///home/user/Idolmancy-Mannenhitsu/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, acceptDownloads: true, hasTouch: true });
```

Use a phone viewport (412×915) — the app is mobile-first. Collect
`page.on('console')` errors and `pageerror` throughout.

## Flows worth driving

1. **Chords**: Chords tab → `.btn.primary.wide` (new pattern) → tap
   `.chord-cell.empty` → picker modal: diatonic chips (only when a key is set
   in the Song tab), `.root-grid .cellbtn`, quality chips, length chips
   (`.picker-inline .chip-row`), apply via `.modal-actions .btn.primary`.
2. **Drums**: Drums tab → new pattern → `.drum-row` × `.step` cells cycle
   off→on→accent. Lane order top→bottom: crash, openHat, closedHat, cowbell,
   hiTom, loTom, clap, snare, kick.
3. **Song**: `.tl-lane .btn.icon` opens the add-placement modal (pattern
   select + 1-based start-bar number input, overlap shows `.warn` and
   disables Add). `+ Label` adds sections. Transport play shows
   `.tl-playhead`.
4. **Exports**: Export MIDI / Save buttons trigger downloads — use
   `page.waitForEvent('download')`. Parse the .mid: expect `MThd`, format 1,
   3 `MTrk` chunks, PPQ 480, tempo/timesig metas, drums on status `0x99`.
5. **Persistence**: `page.reload()` must restore the project (localStorage).

## Gotchas

- Playback is Web Audio; headless Chromium runs it fine after a click
  (user gesture). You can only assert UI state (Stop button, playhead), not sound.
- Confirm dialogs (delete in-use pattern, New song) need `page.once('dialog', …)`.
- Unit tests (`npm test`) cover theory + MIDI encoding; they are CI, not verification.
