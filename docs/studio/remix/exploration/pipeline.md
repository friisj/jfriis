# Remix — Pipeline Architecture

> Stage design, data flow, and interface contracts between pipeline stages.

---

## Pipeline Overview

```
┌─────────────────┐
│  Source Audio    │  Input: audio file (WAV, MP3, FLAC)
│  + Recipe        │  Input: recipe configuration (JSON)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  1. Separation  │  Demucs (Python microservice)
│                 │  Output: StemSet — individual audio files per stem
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Analysis    │  librosa (Python microservice)
│                 │  Output: AnalysisResult — BPM, key, transients, energy map
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Chopping    │  Custom (Python microservice)
│                 │  Output: SampleBank — chops with metadata per stem
└────────┬────────┘
         │
         ▼  ── boundary: Python → Browser ──
         │
┌─────────────────┐
│  4. Patterns    │  Rule-based templates + LLM (Next.js)
│                 │  Output: PatternSet — sequenced chop references per lane
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Arrangement │  Template + LLM (Next.js)
│                 │  Output: Arrangement — sections × lanes over time
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Mixdown     │  Web Audio API (Browser)
│                 │  Output: rendered audio file
└────────┴────────┘
```

### Runtime Boundary

Stages 1–3 run in the **Python microservice** (Demucs + librosa + custom chopping). The microservice receives source audio + recipe, returns a `SampleBank` with audio files + metadata.

Stages 4–6 run in the **browser** (Next.js + Web Audio API). They receive the sample bank and recipe, generate patterns and arrangement, and render via Web Audio.

This boundary is clean: Python does the heavy ML/audio-analysis lifting; the browser handles the creative/interactive stages where the user intervenes.

---

## Stage Interfaces

### 1. Separation → StemSet

```typescript
interface StemSet {
  source: SourceInfo
  stems: Stem[]
}

interface SourceInfo {
  filename: string
  duration_ms: number
  sample_rate: number
  channels: number
}

interface Stem {
  type: StemType           // 'drums' | 'bass' | 'vocals' | 'other' | 'guitar' | 'piano'
  audio_url: string        // URL to separated audio file (Supabase storage)
  duration_ms: number
  peak_amplitude: number   // for level normalization
}
```

### 2. Analysis → AnalysisResult

```typescript
interface AnalysisResult {
  bpm: number
  bpm_confidence: number   // 0–1
  key: string              // e.g., 'Am', 'C#', 'Eb'
  key_confidence: number   // 0–1
  time_signature: [number, number]  // e.g., [4, 4]
  bar_duration_ms: number  // derived from BPM + time signature
  stems: StemAnalysis[]
}

interface StemAnalysis {
  stem_type: StemType
  transients: Transient[]       // onset positions
  energy_map: EnergyPoint[]     // per-bar energy levels
  spectral_centroid_mean: number // brightness measure
  rms_mean: number              // average loudness
}

interface Transient {
  time_ms: number
  strength: number  // 0–1, amplitude of onset
}

interface EnergyPoint {
  bar: number       // 1-indexed
  time_ms: number   // start of bar
  energy: number    // 0–1 normalized
}
```

### 3. Chopping → SampleBank

```typescript
interface SampleBank {
  source: SourceInfo
  analysis: AnalysisResult
  stems: StemChops[]
}

interface StemChops {
  stem_type: StemType
  chops: Chop[]
}

interface Chop {
  id: string                // unique within the bank
  stem_type: StemType
  audio_url: string         // URL to chop audio file
  start_ms: number          // position in original stem
  end_ms: number
  duration_ms: number
  bar_start: number         // which bar this chop starts in (1-indexed)
  bar_end: number
  strategy: 'transient' | 'bar' | 'hybrid'  // how this chop was created
  energy: number            // 0–1, RMS energy of this chop
  has_transient_onset: boolean  // starts with a sharp attack?
  tags: string[]            // auto-generated: 'sustained', 'percussive', 'tonal', 'noisy'
}
```

### 4. Patterns → PatternSet

```typescript
interface PatternSet {
  bpm: number
  time_signature: [number, number]
  patterns: Pattern[]
}

interface Pattern {
  id: string
  stem_type: StemType
  length_bars: number
  steps: PatternStep[]
}

interface PatternStep {
  bar: number           // which bar (1-indexed)
  beat: number          // which beat within bar (1-indexed)
  subdivision: number   // e.g., 1 = on beat, 0.5 = 8th note, 0.25 = 16th
  chop_id: string       // reference to Chop in sample bank
  velocity: number      // 0–1
  pitch_shift: number   // semitones (0 = original)
  reverse: boolean
  duration_override_ms?: number  // if set, truncate/extend chop playback
}
```

### 5. Arrangement → Arrangement

```typescript
interface Arrangement {
  bpm: number
  total_bars: number
  sections: Section[]
}

interface Section {
  name: string          // 'intro', 'build', 'peak', 'drift', 'dissolve', etc.
  start_bar: number
  length_bars: number
  lanes: Lane[]
}

interface Lane {
  stem_type: StemType
  pattern_id: string    // reference to Pattern
  volume: number        // 0–1, section-level volume for this lane
  muted: boolean
  effects_override?: Partial<MixdownEffects>  // per-section per-lane effect tweaks
}
```

### 6. Mixdown → Output

```typescript
interface MixdownConfig {
  master: {
    reverb: number          // 0–1, send level
    reverb_decay: number    // seconds
    compression_ratio: number
    compression_threshold: number  // dB
    stereo_width: number    // 1.0 = normal, >1 = widened
    limiter_ceiling: number // dB
  }
  per_lane: Record<StemType, {
    volume: number
    pan: number             // -1 to 1
    eq_low: number          // dB boost/cut
    eq_mid: number
    eq_high: number
    reverb_send: number     // 0–1
    delay_send: number      // 0–1
    delay_time_ms: number
    delay_feedback: number  // 0–1
  }>
}

interface MixdownOutput {
  audio_url: string         // final rendered file
  duration_ms: number
  format: 'wav' | 'mp3'
  sample_rate: number
}
```

---

## Recipe → Stage Parameter Mapping

The recipe is the user-facing configuration. Internally, recipe parameters map to stage-specific behavior:

```
Recipe Parameter          → Stage(s) Affected
─────────────────────────────────────────────
separation.model          → 1. Which Demucs model
separation.stems          → 1. 4-stem or 6-stem mode
chopping.strategy         → 3. Transient vs bar vs hybrid
chopping.min_length_ms    → 3. Minimum chop duration
chopping.prefer_sustained → 3. Bias toward bar-based, longer chops
patterns.density          → 4. Steps per bar
patterns.swing            → 4. Timing offset on even steps
patterns.variation_rate   → 4. How often new chops are introduced
arrangement.sections      → 5. Section names and implied energy curve
arrangement.phrase_length → 5. Bar count per repeating unit
arrangement.energy_curve  → 5. Macro intensity shape
mixdown.reverb            → 6. Master reverb send
mixdown.compression       → 6. Master compression ratio
mixdown.stereo_width      → 6. Master stereo widening
```

---

## Python Microservice API

The microservice exposes a single endpoint that handles stages 1–3:

```
POST /process
Content-Type: multipart/form-data

Fields:
  audio: <file>           — source audio file
  recipe: <json string>   — recipe configuration (separation + analysis + chopping params)

Response: 200 OK
{
  "sample_bank": SampleBank,    // metadata + chop references
  "stems": ["url1", "url2"],    // full stem audio URLs
  "chops": ["url1", "url2"]     // individual chop audio URLs
}
```

Audio files are uploaded to Supabase storage (`remix-audio` bucket) by the microservice, and URLs are returned in the response.

### Microservice Stack

- **FastAPI** — lightweight async Python web framework
- **Demucs** — stem separation (torch)
- **librosa** — audio analysis
- **soundfile** — audio I/O (reading/writing WAV)
- **pydantic** — request/response models

### Local Development

```bash
cd services/remix-pipeline/
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8100 --reload
```

---

## Storage Layout

```
Supabase Storage: remix-audio/
  {job_id}/
    source.wav              — original upload
    stems/
      drums.wav
      bass.wav
      vocals.wav
      other.wav
      [guitar.wav]          — if 6-stem mode
      [piano.wav]
    chops/
      drums/
        drums_001.wav
        drums_002.wav
        ...
      bass/
        bass_001.wav
        ...
      ...
    output/
      mixdown.wav           — final rendered output
```

---

## Job Model

A pipeline run is tracked as a **job** — persisted to the database so the user can revisit, re-run stages, or fork from any point.

```typescript
interface RemixJob {
  id: string
  source_audio_url: string
  recipe: Recipe                  // full recipe snapshot at creation time
  status: 'uploading' | 'separating' | 'analyzing' | 'chopping' | 'patterning' | 'arranging' | 'mixing' | 'complete' | 'error'
  current_stage: number           // 1–6
  stem_set?: StemSet              // populated after stage 1
  analysis?: AnalysisResult       // populated after stage 2
  sample_bank?: SampleBank        // populated after stage 3
  pattern_set?: PatternSet        // populated after stage 4
  arrangement?: Arrangement       // populated after stage 5
  mixdown_output?: MixdownOutput  // populated after stage 6
  error?: string
  created_at: string
  updated_at: string
}
```

---

*This document defines the target architecture. Implementation will validate and refine these interfaces.*
