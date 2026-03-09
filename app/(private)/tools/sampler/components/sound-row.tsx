'use client';

import { useState, useRef, useEffect } from 'react';
import { IconPencil, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateSound, deleteSound } from '@/lib/sampler';
import type { SamplerSound } from '@/lib/types/sampler';
import { SoundPreview } from './sound-preview';

interface SoundRowProps {
  sound: SamplerSound;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, name: string) => void;
}

export function SoundRow({ sound, onDeleted, onRenamed }: SoundRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sound.name);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === sound.name) {
      setName(sound.name);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateSound(sound.id, { name: trimmed });
      onRenamed(sound.id, trimmed);
      setEditing(false);
    } catch (e) {
      console.error('Failed to rename:', e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteSound(sound.id);
      onDeleted(sound.id);
    } catch (e) {
      console.error('Failed to delete:', e);
      setDeleting(false);
    }
  }

  return (
    <tr className={`border-b last:border-0 hover:bg-muted/50 group ${deleting ? 'opacity-50' : ''}`}>
      <td className="p-3">
        <SoundPreview audioUrl={sound.audio_url} />
      </td>
      <td className="p-3">
        {editing ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => { e.preventDefault(); handleRename(); }}
          >
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setName(sound.name); setEditing(false); }
              }}
              className="h-7 px-2 text-sm border rounded bg-background w-full max-w-[200px]"
              disabled={saving}
              autoFocus
            />
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={saving}
            >
              <IconCheck size={14}  />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => { setName(sound.name); setEditing(false); }}
            >
              <IconX size={14}  />
            </Button>
          </form>
        ) : (
          <span
            className="font-medium cursor-pointer hover:underline"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            {sound.name}
          </span>
        )}
      </td>
      <td className="p-3">
        <Badge variant="secondary">{sound.type}</Badge>
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {sound.duration_ms
          ? `${(sound.duration_ms / 1000).toFixed(1)}s`
          : '—'}
      </td>
      <td className="p-3">
        <div className="flex gap-1 flex-wrap">
          {sound.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </td>
      <td className="p-3">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing(true)}
            title="Rename"
          >
            <IconPencil size={14}  />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
            title="Delete"
          >
            <IconTrash size={14}  />
          </Button>
        </div>
      </td>
    </tr>
  );
}
