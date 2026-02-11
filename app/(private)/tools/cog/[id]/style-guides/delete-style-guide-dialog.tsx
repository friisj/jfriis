'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { deleteStyleGuide } from '@/lib/cog';
import type { CogStyleGuide } from '@/lib/types/cog';

interface DeleteStyleGuideDialogProps {
  styleGuide: CogStyleGuide;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (id: string) => void;
}

export function DeleteStyleGuideDialog({
  styleGuide,
  isOpen,
  onClose,
  onSuccess,
}: DeleteStyleGuideDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);

    try {
      await deleteStyleGuide(styleGuide.id);
      onSuccess(styleGuide.id);
    } catch (err) {
      console.error('Failed to delete style guide:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete style guide');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Style Guide</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{styleGuide.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
