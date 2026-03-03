'use client';

import { useState, useEffect } from 'react';
import { Waveform } from './waveform';
import { ADSREditor } from './adsr-editor';
import { updateSound } from '@/lib/sampler';
import type { PadWithSound, TrimConfig, SamplerSound } from '@/lib/types/sampler';
import type { ToneSynthConfig, SynthEnvelope } from '@/lib/sampler-synth';

interface SoundEditorProps {
  pad: PadWithSound;
  getBuffer: (url: string) => AudioBuffer | null;
  onTrimChange: (trim: TrimConfig | undefined) => void;
  onSoundUpdated: (sound: SamplerSound) => void;
}

export function SoundEditor({ pad, getBuffer, onTrimChange, onSoundUpdated }: SoundEditorProps) {
  const [proceduralBuffer, setProceduralBuffer] = useState<AudioBuffer | null>(null);
  const [rendering, setRendering] = useState(false);

  const sound = pad.sound;
  const isProcedural = sound?.type === 'procedural';
  const isBuffer = sound?.type === 'file' || sound?.type === 'generated';
  const config = isProcedural ? (sound.source_config as unknown as ToneSynthConfig) : null;

  // Offline render procedural sounds for visualization
  useEffect(() => {
    if (!isProcedural || !config?.notes) {
      setProceduralBuffer(null);
      return;
    }

    let cancelled = false;
    setRendering(true);

    import('@/lib/sampler-offline-render')
      .then(({ renderProceduralToBuffer }) => renderProceduralToBuffer(config))
      .then((buf) => {
        if (!cancelled) setProceduralBuffer(buf);
      })
      .catch((err) => {
        console.warn('Offline render failed:', err);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isProcedural, config]);

  if (!sound) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No sound assigned
      </div>
    );
  }

  // Get buffer for waveform display
  const audioBuffer = isBuffer && sound.audio_url
    ? getBuffer(sound.audio_url)
    : proceduralBuffer;

  // Calculate normalized trim values from ms
  const bufferDurationMs = audioBuffer ? audioBuffer.duration * 1000 : 0;
  const trimStart = pad.effects.trim && bufferDurationMs > 0
    ? pad.effects.trim.startMs / bufferDurationMs
    : 0;
  const trimEnd = pad.effects.trim && bufferDurationMs > 0
    ? pad.effects.trim.endMs / bufferDurationMs
    : 1;

  function handleTrimChange(start: number, end: number) {
    if (!audioBuffer) return;
    const durationMs = audioBuffer.duration * 1000;

    // If basically full range, clear trim
    if (start < 0.005 && end > 0.995) {
      onTrimChange(undefined);
    } else {
      onTrimChange({
        startMs: Math.round(start * durationMs),
        endMs: Math.round(end * durationMs),
      });
    }
  }

  async function handleEnvelopeChange(envelope: SynthEnvelope) {
    if (!config || !sound) return;

    const newConfig = { ...config, envelope };
    try {
      const updated = await updateSound(sound.id, {
        source_config: newConfig as unknown as Record<string, unknown>,
      });
      onSoundUpdated(updated);
    } catch (err) {
      console.error('Failed to update envelope:', err);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">Waveform</h4>
        {rendering ? (
          <div className="w-full h-20 rounded border border-border bg-muted/30 flex items-center justify-center">
            <span className="text-xs text-muted-foreground">Rendering...</span>
          </div>
        ) : (
          <Waveform
            buffer={audioBuffer}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onTrimChange={isBuffer ? handleTrimChange : undefined}
            editable={isBuffer}
          />
        )}
        {isBuffer && pad.effects.trim && (
          <p className="text-[10px] text-muted-foreground">
            Trim: {pad.effects.trim.startMs}ms - {pad.effects.trim.endMs}ms
          </p>
        )}
      </div>

      {isProcedural && config?.envelope && (
        <ADSREditor
          envelope={config.envelope}
          onChange={handleEnvelopeChange}
        />
      )}
    </div>
  );
}
