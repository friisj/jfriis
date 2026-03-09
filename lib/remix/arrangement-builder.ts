/**
 * Stage 5: Arrangement Builder
 *
 * Takes pattern set + recipe arrangement config, assembles patterns into
 * sections (intro → body → outro) following the energy curve. Each section
 * selects which stems are active and maps patterns to lanes.
 */

import type {
  Arrangement,
  Lane,
  PatternSet,
  Recipe,
  Section,
  StemType,
} from '@/lib/types/remix'

// ---------------------------------------------------------------------------
// Energy curves — define how energy flows across the arrangement
// ---------------------------------------------------------------------------

type CurveFunction = (position: number) => number // position 0–1, returns energy 0–1

const ENERGY_CURVES: Record<string, CurveFunction> = {
  flat: () => 0.5,
  build: (p) => p,
  arc: (p) => Math.sin(p * Math.PI),
  dissolve: (p) => 1 - p,
  wave: (p) => 0.5 + 0.5 * Math.sin(p * Math.PI * 2),
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildArrangement(
  patternSet: PatternSet,
  recipe: Recipe
): Arrangement {
  const { sections: sectionTemplates, energy_curve } = recipe.arrangement
  const curveFunc = ENERGY_CURVES[energy_curve] ?? ENERGY_CURVES.arc

  // Build a map of available patterns by stem type
  const patternByStem: Record<string, string> = {}
  for (const pattern of patternSet.patterns) {
    patternByStem[pattern.stem_type] = pattern.id
  }

  const availableStems = new Set(
    patternSet.patterns.map((p) => p.stem_type)
  )

  // Calculate total bars
  const totalBars =
    recipe.arrangement.total_bars ??
    sectionTemplates.reduce((sum, s) => sum + s.length_bars, 0)

  // Build sections
  const sections: Section[] = []
  let currentBar = 0
  const totalSectionBars = sectionTemplates.reduce(
    (sum, s) => sum + s.length_bars,
    0
  )

  for (let i = 0; i < sectionTemplates.length; i++) {
    const template = sectionTemplates[i]
    const sectionMidpoint =
      (currentBar + template.length_bars / 2) / totalSectionBars
    const curveEnergy = curveFunc(sectionMidpoint)

    // Filter active stems to only those we actually have patterns for
    const activeStems = template.active_stems.filter((st) =>
      availableStems.has(st)
    )

    // Build lanes — one per active stem
    const lanes: Lane[] = activeStems.map((stemType: StemType) => {
      const patternId = patternByStem[stemType]

      // Volume scales with both section energy template and curve position
      const energyBlend = template.energy * 0.6 + curveEnergy * 0.4
      const volume = Math.max(0.1, Math.min(1.0, energyBlend))

      return {
        stem_type: stemType,
        pattern_id: patternId,
        volume,
        muted: false,
      }
    })

    sections.push({
      name: template.name,
      start_bar: currentBar,
      length_bars: template.length_bars,
      lanes,
    })

    currentBar += template.length_bars
  }

  return {
    bpm: patternSet.bpm,
    total_bars: totalBars,
    sections,
  }
}
