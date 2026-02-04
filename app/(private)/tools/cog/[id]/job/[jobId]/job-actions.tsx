'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteJob, retryJob, duplicateJob } from '@/lib/cog';

interface JobActionsProps {
  jobId: string;
  seriesId: string;
  jobStatus: string;
}

export function JobActions({ jobId, seriesId, jobStatus }: JobActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canDelete = jobStatus !== 'running';
  const canRetry = jobStatus === 'failed';
  const canDuplicate = jobStatus !== 'running';

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteJob(jobId);
      router.push(`/tools/cog/${seriesId}`);
    } catch (error) {
      console.error('Failed to delete job:', error);
      setDeleting(false);
      setShowConfirm(false);
    }
  }

  async function handleRetry() {
    setRetrying(true);
    try {
      await retryJob(jobId);
      router.refresh();
    } catch (error) {
      console.error('Failed to retry job:', error);
    } finally {
      setRetrying(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const newJob = await duplicateJob(jobId);
      // Navigate to the new job
      router.push(`/tools/cog/${seriesId}/job/${newJob.id}`);
    } catch (error) {
      console.error('Failed to duplicate job:', error);
      setDuplicating(false);
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
        <span className="text-sm text-destructive">Delete this job and all its steps?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? 'Deleting...' : 'Yes, delete'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(false)}
          disabled={deleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {canDuplicate && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDuplicate}
          disabled={duplicating}
        >
          {duplicating ? 'Duplicating...' : 'Duplicate'}
        </Button>
      )}
      {canRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={retrying}
        >
          {retrying ? 'Retrying...' : 'Retry Job'}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={!canDelete}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        Delete Job
      </Button>
    </div>
  );
}
