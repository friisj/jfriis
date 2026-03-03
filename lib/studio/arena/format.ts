/**
 * Arena Skill & Theme Formatters
 *
 * Shared raw-text formatters for rendering skill state and theme configs
 * as readable file-like representations (skill.yaml, theme.config).
 */

import type { ArenaTheme } from './db-types'
import type { DimensionState, TokenMap } from './types'

/** Render a DimensionState as a skill.yaml block */
export function skillToRaw(state: DimensionState): string {
  const lines: string[] = []
  lines.push('decisions:')
  for (const d of state.decisions) {
    lines.push(`  ${d.label}:`)
    lines.push(`    rationale: ${d.rationale}`)
    if (d.intent) lines.push(`    intent: ${d.intent}`)
    lines.push(`    confidence: ${d.confidence}`)
  }
  if (state.rules.length > 0) {
    lines.push('')
    lines.push('rules:')
    for (const r of state.rules) {
      lines.push(`  ${r.type}: ${r.statement}`)
    }
  }
  return lines.join('\n')
}

/** Render a single dimension's tokens as a tailwind.config-style block */
export function themeToRaw(tokens: TokenMap, dimension: string, meta?: { name?: string; platform?: string }): string {
  const name = meta?.name ?? 'default'
  const platform = meta?.platform ?? 'tailwind'
  const lines: string[] = []
  lines.push(`// ${dimension} — "${name}" (${platform})`)
  lines.push('{')
  for (const [label, value] of Object.entries(tokens)) {
    const key = label.toLowerCase().replace(/\s+/g, '-')
    lines.push(`  '${key}': '${value}',`)
  }
  lines.push('}')
  return lines.join('\n')
}

/** Render all theme rows as a unified tailwind.config */
export function themesToRaw(themes: ArenaTheme[]): string {
  if (themes.length === 0) return ''
  const lines: string[] = []
  lines.push('// theme.config (tailwind)')
  lines.push('{')
  for (const theme of themes) {
    lines.push(`  // ${theme.dimension}`)
    for (const [label, value] of Object.entries(theme.tokens)) {
      const key = label.toLowerCase().replace(/\s+/g, '-')
      lines.push(`  '${theme.dimension}-${key}': '${value}',`)
    }
    if (theme !== themes[themes.length - 1]) lines.push('')
  }
  lines.push('}')
  return lines.join('\n')
}
