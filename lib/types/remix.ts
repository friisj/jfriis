/**
 * Remix — Pipeline Types
 *
 * Type definitions for the source-aware audio recomposition pipeline.
 * These types define the data contracts between pipeline stages.
 */

// ---------------------------------------------------------------------------
// Shared enums / primitives
// ---------------------------------------------------------------------------

export type StemType =
  | 'drums'
  | 'bass'
  | 'vocals'
  | 'other'
  | 'guitar'
  | 'piano'

export type ChopStrategy = 'transient' | 'bar' | 'hybrid'

export type EnergyCurve = 'flat' | 'build' | 'arc' | 'dissolve' | 'wave'

export type JobStatus =
  | 'uploading'
  | 'separating'
  | 'analyzing'
  | 'chopping'
  | 'patterning'
  | 'arranging'
  | 'mixing'
  | 'complete'
  | 'error'

// ---------------------------------------------------------------------------
// Recipe — user-facing pipeline configuration
// ---------------------------------------------------------------------------

export interface Recipe {
  name: string
  description: string

  separation: {
    model: 'htdemucs' | 'htdemucs_6s'
    stems: 4 | 6
  }

  analysis: {
    detect_key: boolean
    energy_resolution: 'beat' | 'bar'
  }

  chopping: {
    strategy: ChopStrategy
    min_length_ms: number
    max_length_ms: number
    prefer_sustained: boolean
    stems_override?: Partial<
      Record<StemType, { strategy?: ChopStrategy; min_length_ms?: number }>
    >
  }

  patterns: {
    density: number // 0–1
    swing: number // 0–1
    variation_rate: number // 0–1
    humanize: number // 0–1
    pitch_range: number // semitones
    allow_reverse: boolean
    stems_override?: Partial<
      Record<StemType, { density?: number; swing?: number }>
    >
  }

  arrangement: {
    sections: SectionTemplate[]
    phrase_length: number // bars
    total_bars?: number
    energy_curve: EnergyCurve
  }

  mixdown: {
    reverb: number // 0–1
    reverb_decay: number // seconds
    compression: number // 0–1
    stereo_width: number // 1.0 = normal
    per_stem?: Partial<
      Record<
        StemType,
        {
          volume?: number
          pan?: number
          reverb_send?: number
          delay_send?: number
          delay_time_ms?: number
        }
      >
    >
  }
}

export interface SectionTemplate {
  name: string
  length_bars: number
  active_stems: StemType[]
  energy: number // 0–1
}

// ---------------------------------------------------------------------------
// Stage 1: Separation → StemSet
// ---------------------------------------------------------------------------

export interface SourceInfo {
  filename: string
  duration_ms: number
  sample_rate: number
  channels: number
}

export interface Stem {
  type: StemType
  audio_url: string
  duration_ms: number
  peak_amplitude: number
}

export interface StemSet {
  source: SourceInfo
  stems: Stem[]
}

// ---------------------------------------------------------------------------
// Stage 2: Analysis → AnalysisResult
// ---------------------------------------------------------------------------

export interface Transient {
  time_ms: number
  strength: number // 0–1
}

export interface EnergyPoint {
  bar: number // 1-indexed
  time_ms: number
  energy: number // 0–1
}

export interface StemAnalysis {
  stem_type: StemType
  transients: Transient[]
  energy_map: EnergyPoint[]
  spectral_centroid_mean: number
  rms_mean: number
}

export interface AnalysisResult {
  bpm: number
  bpm_confidence: number
  key: string
  key_confidence: number
  time_signature: [number, number]
  bar_duration_ms: number
  stems: StemAnalysis[]
}

// ---------------------------------------------------------------------------
// Stage 3: Chopping → SampleBank
// ---------------------------------------------------------------------------

export interface Chop {
  id: string
  stem_type: StemType
  audio_url: string
  start_ms: number
  end_ms: number
  duration_ms: number
  bar_start: number
  bar_end: number
  strategy: ChopStrategy
  energy: number
  has_transient_onset: boolean
  tags: string[]
}

export interface StemChops {
  stem_type: StemType
  chops: Chop[]
}

export interface SampleBank {
  source: SourceInfo
  analysis: AnalysisResult
  stems: StemChops[]
}

// ---------------------------------------------------------------------------
// Stage 4: Patterns → PatternSet
// ---------------------------------------------------------------------------

export interface PatternStep {
  bar: number
  beat: number
  subdivision: number
  chop_id: string
  velocity: number
  pitch_shift: number
  reverse: boolean
  duration_override_ms?: number
}

export interface Pattern {
  id: string
  stem_type: StemType
  length_bars: number
  steps: PatternStep[]
}

export interface PatternSet {
  bpm: number
  time_signature: [number, number]
  patterns: Pattern[]
}

// ---------------------------------------------------------------------------
// Stage 5: Arrangement
// ---------------------------------------------------------------------------

export interface Lane {
  stem_type: StemType
  pattern_id: string
  volume: number
  muted: boolean
  effects_override?: Partial<LaneMixdownEffects>
}

export interface Section {
  name: string
  start_bar: number
  length_bars: number
  lanes: Lane[]
}

export interface Arrangement {
  bpm: number
  total_bars: number
  sections: Section[]
}

// ---------------------------------------------------------------------------
// Stage 6: Mixdown
// ---------------------------------------------------------------------------

export interface LaneMixdownEffects {
  volume: number
  pan: number
  eq_low: number
  eq_mid: number
  eq_high: number
  reverb_send: number
  delay_send: number
  delay_time_ms: number
  delay_feedback: number
}

export interface MixdownConfig {
  master: {
    reverb: number
    reverb_decay: number
    compression_ratio: number
    compression_threshold: number
    stereo_width: number
    limiter_ceiling: number
  }
  per_lane: Partial<Record<StemType, LaneMixdownEffects>>
}

export interface MixdownOutput {
  audio_url: string
  duration_ms: number
  format: 'wav' | 'mp3'
  sample_rate: number
}

// ---------------------------------------------------------------------------
// Job — full pipeline run
// ---------------------------------------------------------------------------

export interface RemixJob {
  id: string
  source_audio_url: string
  recipe: Recipe
  status: JobStatus
  current_stage: number // 1–6
  stem_set?: StemSet
  analysis?: AnalysisResult
  sample_bank?: SampleBank
  pattern_set?: PatternSet
  arrangement?: Arrangement
  mixdown_output?: MixdownOutput
  error?: string
  created_at: string
  updated_at: string
}
