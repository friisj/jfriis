'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getSounds } from '@/lib/sampler';
import { SamplerEngine } from '@/lib/sampler-engine';
import type { SamplerSound } from '@/lib/types/sampler';

interface SoundLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (sound: SamplerSound) => void;
}

export function SoundLibraryPicker({ open, onOpenChange, onSelect }: SoundLibraryPickerProps) {
  const [sounds, setSounds] = useState<SamplerSound[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const previewEngine = useRef<SamplerEngine | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadSounds() {
      try {
        const data = await getSounds();
        if (!cancelled) setSounds(data);
      } catch (err) {
        console.error(err);
      }
    }

    loadSounds();

    if (!previewEngine.current) {
      previewEngine.current = new SamplerEngine();
    }

    return () => {
      cancelled = true;
      previewEngine.current?.dispose();
      previewEngine.current = null;
    };
  }, [open]);

  const filtered = sounds.filter((s) => {
    if (typeFilter && s.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  async function handlePreview(sound: SamplerSound) {
    if (!sound.audio_url || !previewEngine.current) return;
    await previewEngine.current.loadBuffer(sound.audio_url);
    previewEngine.current.playPreview(sound.audio_url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Sound</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sounds..."
            className="flex-1"
          />
        </div>

        <div className="flex gap-1 mb-3">
          {['file', 'generated', 'procedural'].map((t) => (
            <Badge
              key={t}
              variant={typeFilter === t ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setTypeFilter(typeFilter === t ? null : t)}
            >
              {t}
            </Badge>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sounds found</p>
          ) : (
            filtered.map((sound) => (
              <div
                key={sound.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 group"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-8 w-8 p-0"
                  onClick={() => handlePreview(sound)}
                  aria-label={`Preview ${sound.name}`}
                >
                  &#9654;
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sound.name}</p>
                  <div className="flex gap-1">
                    <Badge variant="secondary" className="text-[10px]">{sound.type}</Badge>
                    {sound.duration_ms && (
                      <span className="text-[10px] text-muted-foreground">
                        {(sound.duration_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    onSelect(sound);
                    onOpenChange(false);
                  }}
                >
                  Assign
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
