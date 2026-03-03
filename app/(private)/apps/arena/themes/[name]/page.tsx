import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTemplateThemes } from '@/lib/studio/arena/queries'
import { ThemeEditor } from '@/components/studio/arena/theme-editor'
import type { TokenMap } from '@/lib/studio/arena/types'

interface Props {
  params: Promise<{ name: string }>
}

export default async function ThemeDetailPage({ params }: Props) {
  const { name } = await params
  const themes = await getTemplateThemes(name)
  if (themes.length === 0) notFound()

  // Convert DB rows → Record<dimension, TokenMap> for editor initial state
  const initialTokens: Record<string, TokenMap> = {}
  for (const row of themes) {
    initialTokens[row.dimension] = row.tokens
  }

  // All rows share the same skill_id for template themes
  const skillId = themes[0].skill_id ?? undefined
  const projectId = themes[0].project_id ?? undefined
  const platform = themes[0].platform

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/apps/arena/themes" className="hover:text-slate-700 dark:hover:text-slate-200">
            Themes
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{platform}</span>
          <span>{themes.length} {themes.length === 1 ? 'dimension' : 'dimensions'}</span>
        </div>
      </div>

      <ThemeEditor
        initialTokens={initialTokens}
        themeName={name}
        scope={{ skillId, projectId }}
        platform={platform}
      />
    </div>
  )
}
