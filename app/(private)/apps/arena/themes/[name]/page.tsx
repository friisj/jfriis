import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTemplateThemes } from '@/lib/studio/arena/queries'
import { themesToRaw } from '@/lib/studio/arena/format'

interface Props {
  params: Promise<{ name: string }>
}

export default async function ThemeDetailPage({ params }: Props) {
  const { name } = await params
  const themes = await getTemplateThemes(name)
  if (themes.length === 0) notFound()

  const raw = themesToRaw(themes)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/apps/arena/templates" className="hover:text-slate-700 dark:hover:text-slate-200">
            Templates
          </Link>
          <span>/</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{themes[0].platform}</span>
          <span>{themes.length} {themes.length === 1 ? 'dimension' : 'dimensions'}</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">theme.config</span>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
          {raw}
        </pre>
      </div>
    </div>
  )
}
