'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteJob } from '@/lib/cog';
import type { CogJob } from '@/lib/types/cog';

interface JobsListProps {
  jobs: CogJob[];
  seriesId: string;
}

export function JobsList({ jobs: initialJobs, seriesId }: JobsListProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(jobId: string) {
    setDeletingId(jobId);
    try {
      await deleteJob(jobId);
      setJobs(jobs.filter((j) => j.id !== jobId));
      setConfirmId(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete job:', error);
    } finally {
      setDeletingId(null);
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/50">
        <p className="text-muted-foreground mb-4">No jobs yet</p>
        <Button asChild variant="outline">
          <Link href={`/tools/cog/${seriesId}/job/new`}>Create Job</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      
      <button className="border rounded-lg p-4 hover:bg-muted/50 transition-colors w-full">
        <Link href={`/tools/cog/${seriesId}/job/new`}>New Job</Link>
      </button>
      {jobs.map((job) => (
        <div
          key={job.id}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <Link
              href={`/tools/cog/${seriesId}/job/${job.id}`}
              className="flex-1 min-w-0"
            >
              <h3 className="font-medium">{job.title || 'Untitled Job'}</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {job.base_prompt}
              </p>
            </Link>
            <div className="flex items-center gap-2 ml-4">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  job.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : job.status === 'running'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : job.status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-muted'
                }`}
              >
                {job.status}
              </span>
              {confirmId === job.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id}
                  >
                    {deletingId === job.id ? '...' : 'Yes'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmId(null)}
                    disabled={deletingId === job.id}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmId(job.id)}
                  disabled={job.status === 'running'}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
