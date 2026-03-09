'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Job {
  id: string
  source_filename: string
  status: string
  current_stage: number
  error: string | null
  created_at: string
  recipe_snapshot: {
    separation?: { model: string }
    arrangement?: { sections: { name: string }[] }
  }
}

const STATUS_COLORS: Record<string, string> = {
  complete: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  uploading: 'text-yellow-600 dark:text-yellow-400',
  separating: 'text-blue-600 dark:text-blue-400',
  analyzing: 'text-blue-600 dark:text-blue-400',
  chopping: 'text-blue-600 dark:text-blue-400',
  patterning: 'text-purple-600 dark:text-purple-400',
  arranging: 'text-purple-600 dark:text-purple-400',
  mixing: 'text-purple-600 dark:text-purple-400',
}

export default function RemixJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/remix/jobs')
      .then((res) => res.json())
      .then((data) => {
        setJobs(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Link
          href="/tools/remix"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          + New Job
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No jobs yet.</p>
          <Link
            href="/tools/remix"
            className="text-sm text-foreground underline mt-2 inline-block"
          >
            Start your first remix
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {jobs.map((job) => (
            <div key={job.id} className="py-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {job.source_filename}
                </span>
                <span
                  className={`text-xs font-medium ${STATUS_COLORS[job.status] || 'text-muted-foreground'}`}
                >
                  {job.status}
                  {job.current_stage > 0 &&
                    job.status !== 'complete' &&
                    job.status !== 'error' &&
                    ` (stage ${job.current_stage}/6)`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono">{job.id.slice(0, 8)}</span>
                <span>
                  {new Date(job.created_at).toLocaleDateString()}{' '}
                  {new Date(job.created_at).toLocaleTimeString()}
                </span>
                {job.recipe_snapshot?.separation?.model && (
                  <span>{job.recipe_snapshot.separation.model}</span>
                )}
              </div>
              {job.error && (
                <p className="text-xs text-red-500 mt-1">{job.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
