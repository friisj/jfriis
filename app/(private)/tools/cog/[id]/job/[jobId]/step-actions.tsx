'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteJobStep } from '@/lib/cog';

interface StepActionsProps {
  stepId: string;
  canEdit: boolean;
}

export function StepActions({ stepId, canEdit }: StepActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (!canEdit) return null;

  async function handleDelete() {
    if (!confirm('Delete this shot?')) return;

    setDeleting(true);
    try {
      await deleteJobStep(stepId);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete step:', error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
      title="Delete shot"
    >
      {deleting ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      )}
    </button>
  );
}
