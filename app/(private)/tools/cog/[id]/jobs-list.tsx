'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteJob, duplicatePipelineJob, deleteRemixJob, duplicateRemixJob } from '@/lib/cog';
import type { CogJob, CogRemixJob } from '@/lib/types/cog';

interface JobsListProps {
  jobs: CogJob[];
  remixJobs?: CogRemixJob[];
  seriesId: string;
}

export function JobsList({ jobs: initialJobs, remixJobs: initialRemixJobs, seriesId }: JobsListProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState(initialJobs);
  const [remixJobs, setRemixJobs] = useState(initialRemixJobs || []);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  async function handleDeleteRemix(jobId: string) {
    setDeletingId(jobId);
    try {
      await deleteRemixJob(jobId);
      setRemixJobs(remixJobs.filter((j) => j.id !== jobId));
      setConfirmId(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete remix job:', error);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDuplicate(job: CogJob) {
    if (job.job_type !== 'pipeline') return;
    setDuplicatingId(job.id);
    try {
      const newJob = await duplicatePipelineJob(job.id);
      router.push(`/tools/cog/${seriesId}/pipeline/${newJob.id}`);
    } catch (error) {
      console.error('Failed to duplicate job:', error);
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDuplicateRemix(rj: CogRemixJob) {
    setDuplicatingId(rj.id);
    try {
      const newJob = await duplicateRemixJob(rj.id);
      router.push(`/tools/cog/${seriesId}/remix/${newJob.id}`);
    } catch (error) {
      console.error('Failed to duplicate remix job:', error);
    } finally {
      setDuplicatingId(null);
    }
  }

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

  const hasNoJobs = jobs.length === 0 && remixJobs.length === 0;

  if (hasNoJobs) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-8 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">No jobs yet. Create your first job to get started.</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`/tools/cog/${seriesId}/job/new`}
            className="border rounded-lg p-6 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2"
          >
            <div className="text-2xl">📦</div>
            <div className="font-medium">New Batch Job</div>
            <div className="text-xs text-muted-foreground text-center">
              Generate multiple images from a single prompt
            </div>
          </Link>
          <Link
            href={`/tools/cog/${seriesId}/pipeline/new`}
            className="border rounded-lg p-6 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2"
          >
            <div className="text-2xl">⚡</div>
            <div className="font-medium">New Pipeline</div>
            <div className="text-xs text-muted-foreground text-center">
              Sequential multi-step image generation
            </div>
          </Link>
          <Link
            href={`/tools/cog/${seriesId}/remix/new`}
            className="border rounded-lg p-6 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2"
          >
            <div className="text-2xl">🔄</div>
            <div className="font-medium">New Remix</div>
            <div className="text-xs text-muted-foreground text-center">
              Source stock photos with AI evaluation
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <Link
          href={`/tools/cog/${seriesId}/job/new`}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors text-center"
        >
          New Batch Job
        </Link>
        <Link
          href={`/tools/cog/${seriesId}/pipeline/new`}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors text-center"
        >
          New Pipeline
        </Link>
        <Link
          href={`/tools/cog/${seriesId}/remix/new`}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors text-center"
        >
          New Remix
        </Link>
      </div>
      {/* Remix jobs */}
      {remixJobs.map((rj) => (
        <div
          key={rj.id}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <Link
              href={`/tools/cog/${seriesId}/remix/${rj.id}`}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{rj.title || 'Untitled Remix'}</h3>
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  remix
                </span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {rj.story}
              </p>
            </Link>
            <div className="flex items-center gap-2 ml-4">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  rj.status === 'completed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : rj.status === 'running'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : rj.status === 'failed'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : 'bg-muted'
                }`}
              >
                {rj.status}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDuplicateRemix(rj)}
                disabled={duplicatingId === rj.id}
              >
                {duplicatingId === rj.id ? '...' : 'Duplicate'}
              </Button>
              {confirmId === rj.id ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRemix(rj.id)}
                    disabled={deletingId === rj.id}
                  >
                    {deletingId === rj.id ? '...' : 'Yes'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmId(null)}
                    disabled={deletingId === rj.id}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmId(rj.id)}
                  disabled={rj.status === 'running'}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
      {/* Regular jobs */}
      {jobs.map((job) => {
        const jobLink = job.job_type === 'pipeline'
          ? `/tools/cog/${seriesId}/pipeline/${job.id}`
          : `/tools/cog/${seriesId}/job/${job.id}`;
        return (
          <div
            key={job.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <Link
                href={jobLink}
                className="flex-1 min-w-0"
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{job.title || 'Untitled Job'}</h3>
                  {job.job_type === 'pipeline' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">pipeline</span>
                  )}
                </div>
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
                {job.job_type === 'pipeline' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(job)}
                    disabled={duplicatingId === job.id}
                  >
                    {duplicatingId === job.id ? '...' : 'Duplicate'}
                  </Button>
                )}
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
                    disabled={job.foundation_status === 'running' || job.sequence_status === 'running'}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
