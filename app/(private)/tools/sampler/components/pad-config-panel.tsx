'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Play, Square } from 'lucide-react';
import { updatePad, updateSound } from '@/lib/sampler';
import { EffectsChain } from './effects-chain';
import { Waveform } from './waveform';
import { ADSREditor } from './adsr-editor';
import { SoundLibraryPicker } from './sound-library-picker';
import { SoundGenerateModal } from './sound-generate-modal';
import { SampleRecorder } from './sample-recorder';
import type { PadWithSound, PadEffects, PadType, TrimConfig, SamplerSound } from '@/lib/types/sampler';
import type { ToneSynthConfig, SynthEnvelope } from '@/lib/sampler-synth';

interface PadConfigPanelProps {
  pad: PadWithSound;
  getBuffer: (url: string) => AudioBuffer | null;
  onPadUpdated: (pad: PadWithSound) => void;
  onEffectsChange: (padId: string, effects: PadEffects) => void;
  onSoundUpdated: (sound: SamplerSound) => void;
  onClose: () => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  getPlaybackPosition?: () => number | null;
}

export function PadConfigPanel({ pad, getBuffer, onPadUpdated, onEffectsChange, onSoundUpdated, onClose, isPlaying, onTogglePlay, getPlaybackPosition }: PadConfigPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [proceduralBuffer, setProceduralBuffer] = useState<AudioBuffer | null>(null);
  const [rendering, setRendering] = useState(false);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

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

  // Waveform buffer and trim calculations
  const audioBuffer = isBuffer && sound?.audio_url
    ? getBuffer(sound.audio_url)
    : proceduralBuffer;
  const bufferDurationMs = audioBuffer ? audioBuffer.duration * 1000 : 0;
  const trimStart = pad.effects.trim && bufferDurationMs > 0
    ? pad.effects.trim.startMs / bufferDurationMs
    : 0;
  const trimEnd = pad.effects.trim && bufferDurationMs > 0
    ? pad.effects.trim.endMs / bufferDurationMs
    : 1;

  const save = useCallback(
    async (updates: Record<string, unknown>) => {
      setSaving(true);
      try {
        const updated = await updatePad(pad.id, updates);
        onPadUpdated({ ...updated, sound: pad.sound } as PadWithSound);
      } catch (err) {
        console.error('Failed to update pad:', err);
      } finally {
        setSaving(false);
      }
    },
    [pad.id, pad.sound, onPadUpdated]
  );

  async function handleSoundSelect(sound: SamplerSound) {
    setSaving(true);
    try {
      const updated = await updatePad(pad.id, { sound_id: sound.id });
      onPadUpdated({ ...updated, sound } as PadWithSound);
    } catch (err) {
      console.error('Failed to assign sound:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveSound() {
    setSaving(true);
    try {
      const updated = await updatePad(pad.id, { sound_id: null });
      onPadUpdated({ ...updated, sound: null } as PadWithSound);
    } catch (err) {
      console.error('Failed to remove sound:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleEffectsChange(effects: PadEffects) {
    onEffectsChange(pad.id, effects); // immediate audio update
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updatePad(pad.id, { effects }).catch(console.error);
    }, 500);
  }

  function handleTrimUpdate(trim: TrimConfig | undefined) {
    const newEffects = { ...pad.effects, trim };
    if (!trim) delete newEffects.trim;
    handleEffectsChange(newEffects);
  }

  function handleWaveformTrimChange(start: number, end: number) {
    if (!audioBuffer) return;
    const durationMs = audioBuffer.duration * 1000;
    if (start < 0.005 && end > 0.995) {
      handleTrimUpdate(undefined);
    } else {
      handleTrimUpdate({
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — always visible */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold">
            Pad [{pad.row + 1}, {pad.col + 1}]
          </h3>
          {pad.sound && (
            <p className="text-xs text-muted-foreground truncate">
              {pad.label || pad.sound.name}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClose}>
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Waveform — always visible when pad has sound */}
      {sound && (
        <div className="px-4 pb-2 space-y-1">
          {rendering ? (
            <div className="w-full h-20 rounded border border-border bg-muted/30 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Rendering...</span>
            </div>
          ) : (
            <Waveform
              buffer={audioBuffer}
              trimStart={trimStart}
              trimEnd={trimEnd}
              onTrimChange={isBuffer ? handleWaveformTrimChange : undefined}
              editable={isBuffer}
              getPlaybackPosition={getPlaybackPosition}
            />
          )}
          <div className="flex items-center gap-2">
            {onTogglePlay && (
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0"
                onClick={onTogglePlay}
              >
                {isPlaying ? <Square className="size-3" /> : <Play className="size-3" />}
                <span className="sr-only">{isPlaying ? 'Stop' : 'Play'}</span>
              </Button>
            )}
            {isBuffer && pad.effects.trim && (
              <p className="text-[10px] text-muted-foreground">
                Trim: {pad.effects.trim.startMs}ms – {pad.effects.trim.endMs}ms
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="config" className="flex-1 min-h-0 flex flex-col px-4 pb-4">
        <TabsList className="w-full">
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="effects">Effects</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="overflow-y-auto space-y-5 pt-2">
          {/* Sound Assignment */}
          <div className="space-y-2">
            <Label>Sound</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPickerOpen(true)}
              >
                {pad.sound ? 'Change' : 'Assign'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setGenerateOpen(true)}
              >
                Generate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setSampleOpen(true)}
              >
                Sample
              </Button>
              {pad.sound && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveSound}
                  disabled={saving}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="pad-label">Label</Label>
            <Input
              id="pad-label"
              defaultValue={pad.label || ''}
              onBlur={(e) => {
                const val = e.target.value.trim() || null;
                if (val !== pad.label) save({ label: val });
              }}
              placeholder="Optional label"
            />
          </div>

          {/* Pad Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={pad.pad_type}
              onValueChange={(v: PadType) => save({ pad_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trigger">Trigger (one-shot)</SelectItem>
                <SelectItem value="gate">Gate (hold to play)</SelectItem>
                <SelectItem value="toggle">Toggle (on/off)</SelectItem>
                <SelectItem value="loop">Loop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Choke Group */}
          <div className="space-y-2">
            <Label>Choke Group</Label>
            <Select
              value={pad.choke_group != null ? String(pad.choke_group) : 'none'}
              onValueChange={(v) => save({ choke_group: v === 'none' ? null : Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="1">Group 1</SelectItem>
                <SelectItem value="2">Group 2</SelectItem>
                <SelectItem value="3">Group 3</SelectItem>
                <SelectItem value="4">Group 4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label htmlFor="pad-color">Color</Label>
            <div className="flex gap-2 items-center">
              <input
                id="pad-color"
                type="color"
                defaultValue={pad.color || '#6366f1'}
                onBlur={(e) => save({ color: e.target.value })}
                className="w-8 h-8 rounded border cursor-pointer"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => save({ color: null })}
              >
                Reset
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="effects" className="overflow-y-auto space-y-4 pt-2">
          {isProcedural && config?.envelope && (
            <ADSREditor
              envelope={config.envelope}
              onChange={handleEnvelopeChange}
            />
          )}
          <EffectsChain effects={pad.effects} onChange={handleEffectsChange} />
        </TabsContent>
      </Tabs>

      <SoundLibraryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSoundSelect}
      />
      <SoundGenerateModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerated={(sound) => {
          handleSoundSelect(sound);
          setGenerateOpen(false);
        }}
      />
      <SampleRecorder
        open={sampleOpen}
        onOpenChange={setSampleOpen}
        onSampled={(sound) => {
          handleSoundSelect(sound);
          setSampleOpen(false);
        }}
      />
    </div>
  );
}
