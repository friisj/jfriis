'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import type { LuvGeneration, LuvAestheticPreset } from '@/lib/types/luv';

interface GenerationPanelProps {
  initialGenerations: LuvGeneration[];
  presets: LuvAestheticPreset[];
}

export function GenerationPanel({
  initialGenerations,
  presets,
}: GenerationPanelProps) {
  const [generations] = useState(initialGenerations);
  const [prompt, setPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  const getPublicUrl = (storagePath: string) => {
    const { data } = supabase.storage
      .from('luv-media')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  };

  return (
    <div className="space-y-8">
      {/* Generation Form */}
      <div className="rounded-lg border p-6 space-y-4 max-w-2xl">
        <h2 className="font-semibold">Generate</h2>
        <div>
          <Label htmlFor="gen-prompt">Prompt</Label>
          <Textarea
            id="gen-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image to generate..."
            rows={3}
          />
        </div>
        {presets.length > 0 && (
          <div>
            <Label htmlFor="gen-preset">Aesthetic Preset</Label>
            <select
              id="gen-preset"
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <Label htmlFor="gen-model">Model</Label>
          <Input id="gen-model" value="Coming soon" disabled />
        </div>
        <Button disabled>
          Generate (Coming Soon)
        </Button>
        <p className="text-xs text-muted-foreground">
          Image generation integration is not yet connected. This form shows the
          planned interface.
        </p>
      </div>

      {/* Gallery */}
      <div>
        <h2 className="font-semibold mb-4">
          Gallery ({generations.length})
        </h2>
        {generations.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {generations.map((gen) => (
              <div key={gen.id} className="space-y-1">
                {gen.storage_path ? (
                  <img
                    src={getPublicUrl(gen.storage_path)}
                    alt={gen.prompt.slice(0, 80)}
                    className="w-full aspect-square object-cover rounded-md"
                  />
                ) : (
                  <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                    No image
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {gen.prompt}
                </p>
                {gen.rating && (
                  <p className="text-xs">
                    {'★'.repeat(gen.rating)}
                    {'☆'.repeat(5 - gen.rating)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No generations yet.
          </p>
        )}
      </div>
    </div>
  );
}
