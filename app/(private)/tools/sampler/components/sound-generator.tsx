'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import type { SamplerSound } from '@/lib/types/sampler';

interface SoundGeneratorProps {
  onGenerated: (sound: SamplerSound) => void;
}

export function SoundGenerator({ onGenerated }: SoundGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(2);
  const [influence, setInfluence] = useState(0.3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setLoading(true);
    setPreviewUrl(null);
    setError(null);
    try {
      const res = await fetch('/api/sampler/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt.trim(),
          duration_seconds: duration,
          prompt_influence: influence,
        }),
      });

      if (!res.ok) {
        let message = 'Generation failed';
        try {
          const err = await res.json();
          message = err.error || message;
        } catch {
          message = `Generation failed (${res.status})`;
        }
        setError(message);
        return;
      }

      const sound: SamplerSound = await res.json();
      if (sound.audio_url) setPreviewUrl(sound.audio_url);
      onGenerated(sound);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gen-prompt">Sound Description</Label>
        <Textarea
          id="gen-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. A deep bass drum hit with reverb tail"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Duration: {duration}s</Label>
        <Slider
          value={[duration]}
          onValueChange={([v]) => setDuration(v)}
          min={0.5}
          max={22}
          step={0.5}
        />
      </div>

      <div className="space-y-2">
        <Label>Prompt Influence: {influence.toFixed(1)}</Label>
        <Slider
          value={[influence]}
          onValueChange={([v]) => setInfluence(v)}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {previewUrl && (
        <audio controls src={previewUrl} className="w-full" />
      )}

      <Button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full"
      >
        {loading ? 'Generating...' : 'Generate Sound'}
      </Button>
    </div>
  );
}
