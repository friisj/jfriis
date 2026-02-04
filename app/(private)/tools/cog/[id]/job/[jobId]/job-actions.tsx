'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteJob } from '@/lib/cog';

interface JobActionsProps {
  jobId: string;
  seriesId: string;
  jobStatus: string;
}

export function JobActions({ jobId, seriesId, jobStatus }: JobActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canDelete = jobStatus !== 'running';

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
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowConfirm(true)}
      disabled={!canDelete}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      Delete Job
    </Button>
  );
}
