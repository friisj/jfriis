'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteJobStep } from '@/lib/cog';
import { IconTrash, IconLoader2 } from '@tabler/icons-react';

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
        <IconLoader2 size={16} className="animate-spin" />
      ) : (
        <IconTrash size={16} />
      )}
    </button>
  );
}
