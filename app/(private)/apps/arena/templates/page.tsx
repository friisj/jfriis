import Link from 'next/link'
import { getSkills, getThemesForSkill } from '@/lib/studio/arena/queries'
import { SeedTemplatesButton } from '@/components/studio/arena/seed-templates-button'
import type { ArenaSkill, ArenaTheme } from '@/lib/studio/arena/db-types'
import type { DimensionState } from '@/lib/studio/arena/types'

function getDimensionState(skill: ArenaSkill): DimensionState {
  const state = skill.state
  if ('decisions' in state) return state as DimensionState
  if (skill.dimension && skill.dimension in state) {
    return (state as Record<string, DimensionState>)[skill.dimension]
  }
  return { decisions: [], rules: [] }
}

/** Render the skill as a raw JSON-like file */
function skillToRaw(state: DimensionState): string {
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

/** Render theme tokens as a tailwind.config-style block */
function themeToRaw(themes: ArenaTheme[], dimension: string): string | null {
  const theme = themes.find(t => t.dimension === dimension)
  if (!theme) return null

  const lines: string[] = []
  lines.push(`// ${dimension} — "${theme.name}" (${theme.platform})`)
  lines.push('{')
  for (const [label, value] of Object.entries(theme.tokens)) {
    const key = label.toLowerCase().replace(/\s+/g, '-')
    lines.push(`  '${key}': '${value}',`)
  }
  lines.push('}')
  return lines.join('\n')
}

function TemplateCard({ skill, themes }: { skill: ArenaSkill; themes: ArenaTheme[] }) {
  const dim = skill.dimension ?? 'unknown'
  const state = getDimensionState(skill)
  const skillRaw = skillToRaw(state)
  const themeRaw = themeToRaw(themes, dim)

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{dim}/</span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {skill.name}
          </h3>
        </div>
        <Link
          href={`/apps/arena/skills/${skill.id}`}
          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
        >
          Detail &rarr;
        </Link>
      </div>

      {/* Two raw code blocks side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Skill file */}
        <div className="p-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium mb-2">
            skill.yaml
          </div>
          <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
            {skillRaw}
          </pre>
        </div>

        {/* Theme config */}
        <div className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium mb-2">
            theme.config
          </div>
          {themeRaw ? (
            <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
              {themeRaw}
            </pre>
          ) : (
            <p className="text-xs text-slate-400 italic">No theme config</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function TemplatesPage() {
  const templates = await getSkills({ tier: 'template' })

  const templateThemes = await Promise.all(
    templates.map(async (skill) => ({
      skillId: skill.id,
      themes: await getThemesForSkill(skill.id),
    }))
  )
  const themesMap = new Map(templateThemes.map(t => [t.skillId, t.themes]))

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Templates</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Skill files + theme configs
          </p>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">No templates yet.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              Seed base templates to create starting-point skills for each dimension.
            </p>
          </div>
          <SeedTemplatesButton />
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((skill) => (
            <TemplateCard
              key={skill.id}
              skill={skill}
              themes={themesMap.get(skill.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
