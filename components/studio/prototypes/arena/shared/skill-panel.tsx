/**
 * Arena Inferred Skill Panel
 *
 * Displays the decisions and rules of a SkillState in a compact format.
 * Used across Arena spikes for reviewing inferred/classified tokens.
 */

import type { SkillState } from '@/lib/studio/arena/types'

export function InferredSkillPanel({ skill }: { skill: SkillState }) {
  const dims: (keyof SkillState)[] = ['color', 'typography', 'spacing']
  const hasAny = dims.some(d => skill[d].decisions.length > 0)

  if (!hasAny) {
    return (
      <div className="text-xs text-gray-400 italic p-3">
        No tokens inferred yet. Add inputs to start building the skill.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {dims.map(dim => {
        const state = skill[dim]
        if (state.decisions.length === 0) return null
        return (
          <div key={dim} className="space-y-1">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{dim}</h4>
            {state.decisions.map(d => (
              <div key={d.id} className="flex items-center gap-2 text-xs">
                <span className="text-green-500 flex-shrink-0">+</span>
                <span className="font-medium text-gray-600 dark:text-gray-400">{d.label}:</span>
                <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{d.value}</code>
                <span className="text-gray-400 text-[10px]">[{d.confidence}]</span>
              </div>
            ))}
            {state.rules.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-xs">
                <span className={`flex-shrink-0 ${r.type === 'must-not' ? 'text-red-500' : 'text-blue-500'}`}>
                  {r.type === 'must-not' ? '!' : '*'}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  <span className="font-medium capitalize">{r.type}:</span> {r.statement}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
