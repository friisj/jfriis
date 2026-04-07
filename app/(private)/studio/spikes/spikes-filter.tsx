'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { IconBolt, IconFlask } from '@tabler/icons-react'

interface Spike {
  id: string
  slug: string
  name: string
  description: string | null
  project_id: string
  component_key: string | null
  created_at: string
  projectSlug: string | null
  projectName: string | null
  experimentSlug: string | null
  experimentName: string | null
  experimentType: string | null
}

interface Project {
  id: string
  slug: string
  name: string
}

type SortKey = 'newest' | 'oldest' | 'name' | 'project'

export function SpikesFilter({ spikes, projects }: { spikes: Spike[]; projects: Project[] }) {
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('newest')

  const filtered = useMemo(() => {
    let result = spikes
    if (projectFilter !== 'all') {
      result = result.filter(s => s.project_id === projectFilter)
    }
    switch (sort) {
      case 'newest':
        return [...result].sort((a, b) => b.created_at.localeCompare(a.created_at))
      case 'oldest':
        return [...result].sort((a, b) => a.created_at.localeCompare(b.created_at))
      case 'name':
        return [...result].sort((a, b) => a.name.localeCompare(b.name))
      case 'project':
        return [...result].sort((a, b) => (a.projectName ?? '').localeCompare(b.projectName ?? ''))
    }
  }, [spikes, projectFilter, sort])

  return (
    <>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
        >
          <option value="all">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A-Z</option>
          <option value="project">By project</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} spikes</span>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-100">
        {filtered.map(spike => {
          const href = spike.projectSlug && spike.experimentSlug
            ? `/studio/${spike.projectSlug}/${spike.experimentSlug}/${spike.slug}`
            : null

          return (
            <div key={spike.id} className="py-4 flex items-start gap-4">
              <IconBolt size={18} className="text-purple-500 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {href ? (
                    <Link href={href} className="font-semibold hover:underline truncate">
                      {spike.name}
                    </Link>
                  ) : (
                    <span className="font-semibold truncate">{spike.name}</span>
                  )}
                </div>
                {spike.description && (
                  <p className="text-sm text-gray-500 line-clamp-1">{spike.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  {spike.projectName && (
                    <Link
                      href={`/studio/${spike.projectSlug}`}
                      className="hover:text-gray-600 hover:underline"
                    >
                      {spike.projectName}
                    </Link>
                  )}
                  {spike.experimentName && spike.experimentType === 'spike' && (
                    <span className="flex items-center gap-1">
                      <IconFlask size={12} />
                      <Link
                        href={`/studio/${spike.projectSlug}/${spike.experimentSlug}`}
                        className="hover:text-gray-600 hover:underline"
                      >
                        {spike.experimentName}
                      </Link>
                    </span>
                  )}
                  <span>{new Date(spike.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-12">No spikes match the current filter.</p>
      )}
    </>
  )
}
