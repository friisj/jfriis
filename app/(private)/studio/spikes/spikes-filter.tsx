'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { IconBolt, IconFlask } from '@tabler/icons-react'
import { usePrivateHeader } from '@/components/layout/private-header-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  const { setActions } = usePrivateHeader()

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

  useEffect(() => {
    setActions(
      <div className="flex items-center gap-2">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger size="sm" className="text-xs min-w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
          <SelectTrigger size="sm" className="text-xs min-w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
            <SelectItem value="project">By project</SelectItem>
          </SelectContent>
        </Select>
      </div>
    )
    return () => setActions(null)
  }, [setActions, projectFilter, sort, projects, filtered.length])

  return (
    <>

      {/* List */}
      <div className="divide-y divide-border">
        {filtered.map(spike => {
          const href = spike.projectSlug && spike.experimentSlug
            ? `/studio/${spike.projectSlug}/${spike.experimentSlug}/${spike.slug}`
            : null

          return (
            <div key={spike.id} className="flex items-start gap-2 text-xs p-3">
              <div className="w-32 truncate">
              {spike.projectName && (
                <Link
                  href={`/studio/${spike.projectSlug}`}
                  className="text-neutral-500 hover:text-gray-600 hover:underline"
                >
                  {spike.projectName}
                </Link>
              )}
              </div>
              <div className="flex items-center gap-2 flex-1">
                {href ? (
                  <Link href={href} className="font-semibold hover:underline truncate">
                    {spike.name}
                  </Link>
                ) : (
                  <span className="font-semibold truncate">{spike.name}</span>
                )}
                {spike.description && (
                  <p className="text-gray-500 line-clamp-1">{spike.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 text-gray-500">
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
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-12">No spikes match the current filter.</p>
      )}
    </>
  )
}
