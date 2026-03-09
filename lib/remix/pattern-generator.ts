/**
 * Stage 4: Pattern Generation
 *
 * Takes the SampleBank (chops with metadata) and recipe pattern config,
 * generates rhythmic patterns by placing chops on a quantised timeline grid.
 */

import type {
  Chop,
  Pattern,
  PatternSet,
  PatternStep,
  Recipe,
  SampleBank,
  StemType,
} from '@/lib/types/remix'

// ---------------------------------------------------------------------------
// PRNG — seeded random for reproducible patterns
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickWeighted<T>(items: T[], weights: number[], rand: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rand() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

function quantiseSwing(
  beat: number,
  subdivision: number,
  swing: number
): { beat: number; subdivision: number } {
  // Swing shifts off-beat subdivisions forward
  // Only affects even subdivisions (the "and" of the beat)
  if (subdivision % 2 === 1 && swing > 0) {
    return { beat, subdivision: subdivision + swing * 0.5 }
  }
  return { beat, subdivision }
}

// ---------------------------------------------------------------------------
// Pattern generation per stem
// ---------------------------------------------------------------------------

function generateStemPattern(
  stemType: StemType,
  chops: Chop[],
  config: Recipe['patterns'],
  analysis: SampleBank['analysis'],
  lengthBars: number,
  rand: () => number
): Pattern {
  const steps: PatternStep[] = []
  const beatsPerBar = analysis.time_signature[0]
  const subdivisionsPerBeat = 4 // 16th note resolution

  // Resolve per-stem overrides
  const stemOverride = config.stems_override?.[stemType]
  const density = stemOverride?.density ?? config.density
  const swing = stemOverride?.swing ?? config.swing

  // Weight chops by energy and tags for more musical selection
  const chopWeights = chops.map((chop) => {
    let w = 1
    if (chop.has_transient_onset) w += 0.5
    if (chop.tags.includes('percussive')) w += 0.3
    w += chop.energy * 0.5
    return w
  })

  for (let bar = 0; bar < lengthBars; bar++) {
    for (let beat = 0; beat < beatsPerBar; beat++) {
      for (let sub = 0; sub < subdivisionsPerBeat; sub++) {
        // Determine probability of placing a step here
        let prob = density

        // Beat 1 is more likely to have hits
        if (beat === 0 && sub === 0) prob = Math.min(prob * 1.5, 1)

        // Downbeats more likely than subdivisions
        if (sub === 0) prob *= 1.2
        else if (sub === 2) prob *= 0.9
        else prob *= 0.5

        // Variation: occasionally skip to keep patterns interesting
        if (config.variation_rate > 0 && rand() < config.variation_rate * 0.3) {
          prob *= rand()
        }

        if (rand() > prob) continue

        // Pick a chop
        const chop = pickWeighted(chops, chopWeights, rand)

        // Apply swing
        const swung = quantiseSwing(beat, sub, swing)

        // Humanise velocity
        const baseVelocity = 0.6 + density * 0.3
        const humanOffset = (rand() - 0.5) * config.humanize * 0.4
        const velocity = Math.max(0.1, Math.min(1.0, baseVelocity + humanOffset))

        // Pitch shift
        const pitchShift =
          config.pitch_range > 0
            ? Math.round((rand() - 0.5) * 2 * config.pitch_range)
            : 0

        // Reverse
        const reverse = config.allow_reverse && rand() < 0.1

        steps.push({
          bar,
          beat: swung.beat,
          subdivision: swung.subdivision,
          chop_id: chop.id,
          velocity,
          pitch_shift: pitchShift,
          reverse,
        })
      }
    }
  }

  return {
    id: `pat-${stemType}-${rand().toString(36).slice(2, 8)}`,
    stem_type: stemType,
    length_bars: lengthBars,
    steps,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generatePatterns(
  sampleBank: SampleBank,
  recipe: Recipe,
  seed?: number
): PatternSet {
  const rand = mulberry32(seed ?? Date.now())
  const phraseLength = recipe.arrangement.phrase_length || 4

  const patterns: Pattern[] = []

  for (const stemChops of sampleBank.stems) {
    if (stemChops.chops.length === 0) continue

    const pattern = generateStemPattern(
      stemChops.stem_type,
      stemChops.chops,
      recipe.patterns,
      sampleBank.analysis,
      phraseLength,
      rand
    )
    patterns.push(pattern)
  }

  return {
    bpm: sampleBank.analysis.bpm,
    time_signature: sampleBank.analysis.time_signature,
    patterns,
  }
}
