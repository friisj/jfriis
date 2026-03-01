'use client'

import type { SkillState } from '@/lib/studio/arena/types'

interface TokenDiffProps {
  baseSkill: SkillState
  compareSkill: SkillState
}

export function TokenDiff({ baseSkill, compareSkill }: TokenDiffProps) {
  return (
    <div className="space-y-1">
      {(['color', 'typography', 'spacing'] as const).map(dim => {
        const baseDecs = baseSkill[dim].decisions
        const cmpDecs = compareSkill[dim].decisions
        return baseDecs.map(bd => {
          const cmp = cmpDecs.find(d => d.label === bd.label)
          const changed = cmp && cmp.value !== bd.value
          return (
            <div key={bd.id} className="flex items-center gap-2 text-xs">
              <span className={`flex-shrink-0 w-3 ${changed ? 'text-amber-500' : 'text-gray-300'}`}>
                {changed ? '\u0394' : '\u2022'}
              </span>
              <span className="text-gray-500 w-16 capitalize">{dim}</span>
              <span className="font-medium text-gray-600 dark:text-gray-400 w-28">{bd.label}</span>
              <code className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1 rounded">{bd.value}</code>
              {changed && (
                <>
                  <span className="text-gray-400">{'\u2192'}</span>
                  <code className="text-[10px] bg-purple-100 dark:bg-purple-900/30 px-1 rounded text-purple-700 dark:text-purple-400">{cmp!.value}</code>
                </>
              )}
            </div>
          )
        })
      })}
    </div>
  )
}
