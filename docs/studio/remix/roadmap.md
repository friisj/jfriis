# Remix — Roadmap

## Phase 1: Pipeline Foundation [COMPLETE]

- Docs: README, definitions, research, pipeline architecture, recipe schema
- TypeScript types for all 6 pipeline stages
- DB tables: `remix_recipes`, `remix_jobs` with RLS, 2 seeded presets
- Python microservice (FastAPI): Demucs separation, librosa analysis, chopping
- Next.js API routes: `/api/remix/process`, `/api/remix/recipes`, `/api/remix/jobs`
- Browser UI: upload, recipe picker, recipe summary, jobs list
- Runtime fixes: soundfile/librosa replacing torchaudio, URL rewriting order

## Phase 2: Browser Stages & Playback [COMPLETE]

- Audio playback: HTML5 Audio preview for individual stems and chops
- Analysis display: BPM, key, duration, sample rate cards
- Expandable chop browser with duration, tags, energy bars
- Stage 4 (Pattern Generator): seeded PRNG, quantised 16th-note grid, per-stem overrides
- Stage 5 (Arrangement Builder): energy curves, section-to-lane mapping
- Stage 6 (Mixdown Engine): Web Audio API scheduling, pitch shift, reverse, compression
- RemixPlayer: Generate/Play/Stop/Re-roll with progress bar

## Phase 3: DAW Timeline & Arrangement Editor

- Timeline grid with bars/beats ruler and playback cursor
- Stem lanes stacked vertically with chop blocks positioned on grid
- Section markers and boundaries (intro → drift → peak → dissolve)
- Per-lane controls: mute/solo toggle, volume fader, pan knob
- Drag chops to reposition, add/remove steps
- Editable section lengths and boundaries
- Visual energy curve overlay

## Phase 4: Recipe Tuning & Presets

- Listen-driven tuning of synth-to-ambient preset
- Listen-driven tuning of lofi-chop preset
- Recipe editor UI (adjust parameters, preview effect in real-time)
- Save custom recipes to DB
- A/B comparison: same source, different recipes

## Phase 5: Audio Quality & Export

- Reverb send via ConvolverNode (impulse responses)
- Delay send with feedback and sync-to-BPM
- Per-lane EQ (low/mid/high shelving)
- Master limiter
- Offline WAV rendering (OfflineAudioContext)
- Download exported mix

## Phase 6: Intelligence Layer

- LLM-assisted pattern generation (recipe + analysis → smarter musical decisions)
- Genre-aware chop selection (tag filtering, energy matching)
- Automatic recipe suggestion from source analysis
- Shared audio engine extraction (Sampler + Remix common infrastructure)

## Future / Exploratory

- Node graph UI (alternative to linear timeline)
- Onder integration (generative synthesis layers mixed into recomposition)
- Multi-source remixing (blend stems from different tracks)
- Collaborative recipes (shareable presets)
- Supabase storage for processed audio (replace local file serving)
