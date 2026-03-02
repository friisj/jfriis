import Link from 'next/link'
import { getSkills } from '@/lib/studio/arena/queries'
import { SeedTemplatesButton } from '@/components/studio/arena/seed-templates-button'
import type { ArenaSkill } from '@/lib/studio/arena/db-types'
import type { DimensionState, SkillDecision, SkillRule } from '@/lib/studio/arena/types'

const DIMENSION_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  color: { bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-800', accent: 'text-rose-700 dark:text-rose-400' },
  typography: { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', accent: 'text-blue-700 dark:text-blue-400' },
  spacing: { bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-800', accent: 'text-amber-700 dark:text-amber-400' },
}

const DEFAULT_COLORS = { bg: 'bg-slate-50 dark:bg-slate-950/20', border: 'border-slate-200 dark:border-slate-800', accent: 'text-slate-700 dark:text-slate-400' }

function isColorValue(value: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(value) || /^(rgb|hsl|oklch)\(/.test(value)
}

function getDimensionState(skill: ArenaSkill): DimensionState {
  const state = skill.state
  if ('decisions' in state) return state as DimensionState
  if (skill.dimension && skill.dimension in state) {
    return (state as Record<string, DimensionState>)[skill.dimension]
  }
  return { decisions: [], rules: [] }
}

function DecisionRow({ decision, dimension }: { decision: SkillDecision; dimension: string | null }) {
  const showSwatch = dimension === 'color' && isColorValue(decision.value)
  return (
    <tr className="border-t border-slate-100 dark:border-slate-700/50">
      <td className="py-1.5 pr-3 text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
        {decision.label}
      </td>
      <td className="py-1.5 pr-3">
        <span className="inline-flex items-center gap-1.5">
          {showSwatch && (
            <span
              className="inline-block w-3.5 h-3.5 rounded border border-slate-200 dark:border-slate-600 flex-shrink-0"
              style={{ backgroundColor: decision.value }}
            />
          )}
          <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
            {decision.value}
          </code>
        </span>
      </td>
      <td className="py-1.5 text-xs text-slate-500 dark:text-slate-400">
        {decision.rationale}
      </td>
    </tr>
  )
}

function RuleRow({ rule }: { rule: SkillRule }) {
  const typeColors: Record<string, string> = {
    must: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    should: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'must-not': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    prefer: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  }
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide flex-shrink-0 ${typeColors[rule.type] ?? ''}`}>
        {rule.type}
      </span>
      <span className="text-slate-600 dark:text-slate-400">{rule.statement}</span>
    </div>
  )
}

function TemplateCard({ skill }: { skill: ArenaSkill }) {
  const dim = skill.dimension ?? 'unknown'
  const colors = DIMENSION_COLORS[dim] ?? DEFAULT_COLORS
  const state = getDimensionState(skill)

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div>
          <span className={`text-xs font-semibold uppercase tracking-wide ${colors.accent}`}>
            {dim}
          </span>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
            {skill.name}
          </h3>
          {skill.template_description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {skill.template_description}
            </p>
          )}
        </div>
        <Link
          href={`/apps/arena/skills/${skill.id}`}
          className="text-xs text-purple-600 hover:text-purple-700 font-medium flex-shrink-0"
        >
          Detail &rarr;
        </Link>
      </div>

      {/* Decisions */}
      {state.decisions.length > 0 && (
        <div className="px-5 pb-4">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <th className="text-left pb-1 pr-3 font-medium">Token</th>
                <th className="text-left pb-1 pr-3 font-medium">Value</th>
                <th className="text-left pb-1 font-medium">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {state.decisions.map((d) => (
                <DecisionRow key={d.id} decision={d} dimension={skill.dimension} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rules */}
      {state.rules.length > 0 && (
        <div className="px-5 pb-4 space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
            Rules
          </span>
          {state.rules.map((r) => (
            <RuleRow key={r.id} rule={r} />
          ))}
        </div>
      )}

      {state.decisions.length === 0 && state.rules.length === 0 && (
        <div className="px-5 pb-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Empty template — no decisions or rules defined.
          </p>
        </div>
      )}
    </div>
  )
}

export default async function TemplatesPage() {
  const templates = await getSkills({ tier: 'template' })

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Templates</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Base skill templates — starting points for project dimensions
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
            <TemplateCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  )
}
