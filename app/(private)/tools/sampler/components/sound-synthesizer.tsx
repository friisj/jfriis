'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IconPlayerPlay, IconSquare, IconWand } from '@tabler/icons-react';
import type { SamplerSound } from '@/lib/types/sampler';

interface SoundSynthesizerProps {
  onGenerated: (sound: SamplerSound) => void;
}

export function SoundSynthesizer({ onGenerated }: SoundSynthesizerProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewConfig, setPreviewConfig] = useState<Record<string, unknown> | null>(null);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setPreviewConfig(null);
    handleStop();

    try {
      const res = await fetch('/api/sampler/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt.trim() }),
      });

      if (!res.ok) {
        let message = 'Synthesis failed';
        try {
          const err = await res.json();
          message = err.error || message;
        } catch {
          message = `Synthesis failed (${res.status})`;
        }
        setError(message);
        return;
      }

      const sound: SamplerSound = await res.json();
      setPreviewConfig(sound.source_config);
      onGenerated(sound);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setLoading(false);
    }
  }

  async function handlePreview() {
    if (!previewConfig) return;
    handleStop();

    try {
      // Dynamic import to avoid SSR issues with Tone.js
      const { renderSynthConfig, ensureToneStarted } = await import('@/lib/sampler-synth');
      await ensureToneStarted();

      const { stop } = renderSynthConfig(previewConfig as unknown as Parameters<typeof renderSynthConfig>[0]);
      stopRef.current = stop;
      setPlaying(true);

      // Auto-stop after duration
      const duration = (previewConfig as { duration?: number }).duration ?? 3;
      setTimeout(() => {
        setPlaying(false);
        stopRef.current = null;
      }, (duration + 1) * 1000);
    } catch (err) {
      console.error('Preview failed:', err);
      setError('Preview failed — check browser audio permissions');
    }
  }

  function handleStop() {
    if (stopRef.current) {
      stopRef.current();
      stopRef.current = null;
    }
    setPlaying(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="synth-prompt">Describe a Sound</Label>
        <Textarea
          id="synth-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. A warm analog pad with slow attack and long reverb tail"
          rows={3}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {previewConfig && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={playing ? handleStop : handlePreview}
          >
            {playing ? (
              <><IconSquare size={12} className="mr-1" /> Stop</>
            ) : (
              <><IconPlayerPlay size={12} className="mr-1" /> Preview</>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            {(previewConfig as { synth?: string }).synth} synth
          </span>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full"
      >
        {loading ? (
          'Synthesizing...'
        ) : (
          <><IconWand size={16} className="mr-2" /> Synthesize with AI</>
        )}
      </Button>
    </div>
  );
}
