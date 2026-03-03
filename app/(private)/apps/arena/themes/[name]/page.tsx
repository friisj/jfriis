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
    <div className="-m-6 flex flex-col h-[calc(100vh-3.5rem)]">
      <ThemeEditor
        initialTokens={initialTokens}
        themeName={name}
        scope={{ skillId, projectId }}
        platform={platform}
        dimensionCount={themes.length}
      />
    </div>
  )
}
