import Link from 'next/link'
import { getTemplateThemes } from '@/lib/studio/arena/queries'
import type { ArenaTheme } from '@/lib/studio/arena/db-types'

export const dynamic = 'force-dynamic'

/** Group themes by name, collecting dimension count and color swatches */
function groupThemes(themes: ArenaTheme[]) {
  const byName = new Map<string, ArenaTheme[]>()
  for (const t of themes) {
    const group = byName.get(t.name) ?? []
    group.push(t)
    byName.set(t.name, group)
  }

  return [...byName.entries()].map(([name, rows]) => {
    const colorRow = rows.find(r => r.dimension === 'color')
    const swatches = colorRow
      ? [colorRow.tokens['Primary'], colorRow.tokens['Accent'], colorRow.tokens['Background'], colorRow.tokens['Text']].filter(Boolean)
      : []
    return { name, dimensions: rows.length, platform: rows[0].platform, swatches }
  })
}

export default async function ThemesPage() {
  const allThemes = await getTemplateThemes()
  const grouped = groupThemes(allThemes)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Themes</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {grouped.length} {grouped.length === 1 ? 'theme' : 'themes'}
          </p>
        </div>
        <Link
          href="/apps/arena/themes/new"
          className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          New Theme
        </Link>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400">No themes yet.</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Create a theme from Figma or build one manually.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(({ name, dimensions, platform, swatches }) => (
            <Link
              key={name}
              href={`/apps/arena/themes/${name}`}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{platform}/</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{name}</span>
                {swatches.length > 0 && (
                  <div className="flex gap-1 ml-2">
                    {swatches.map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-sm border border-slate-200 dark:border-slate-600"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {dimensions} {dimensions === 1 ? 'dimension' : 'dimensions'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
