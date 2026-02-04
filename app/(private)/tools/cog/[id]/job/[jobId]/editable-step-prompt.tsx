'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateJobStep } from '@/lib/cog';

interface EditableStepPromptProps {
  stepId: string;
  prompt: string;
  canEdit: boolean;
}

export function EditableStepPrompt({ stepId, prompt, canEdit }: EditableStepPromptProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (editedPrompt === prompt) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      await updateJobStep(stepId, { prompt: editedPrompt });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to update step prompt:', error);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditedPrompt(prompt);
    setIsEditing(false);
  }

  if (!canEdit) {
    return <p className="text-sm whitespace-pre-wrap">{prompt}</p>;
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          className="min-h-[100px] text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p className="text-sm whitespace-pre-wrap pr-16">{prompt}</p>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs h-7"
        onClick={() => setIsEditing(true)}
      >
        Edit
      </Button>
    </div>
  );
}
