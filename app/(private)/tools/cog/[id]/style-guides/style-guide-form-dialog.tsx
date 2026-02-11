'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { createStyleGuide, updateStyleGuide } from '@/lib/cog';
import type { CogStyleGuide } from '@/lib/types/cog';

interface StyleGuideFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seriesId: string;
  userId: string;
  initialData?: CogStyleGuide;
}

export function StyleGuideFormDialog({
  isOpen,
  onClose,
  onSuccess,
  seriesId,
  userId,
  initialData,
}: StyleGuideFormDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [systemPrompt, setSystemPrompt] = useState(initialData?.system_prompt || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    if (!systemPrompt.trim()) {
      setError('System prompt is required');
      return;
    }

    setIsSaving(true);
    try {
      if (initialData) {
        await updateStyleGuide(initialData.id, {
          name,
          description: description || null,
          system_prompt: systemPrompt,
        });
      } else {
        await createStyleGuide({
          series_id: seriesId,
          user_id: userId,
          name,
          description: description || null,
          system_prompt: systemPrompt,
        });
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save style guide:', err);
      setError(err instanceof Error ? err.message : 'Failed to save style guide');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Style Guide' : 'Create Style Guide'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Photography Style"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this style guide"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter the system prompt that will be applied to all generations using this style guide..."
              className="min-h-[200px] font-mono text-sm"
              disabled={isSaving}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : initialData ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
