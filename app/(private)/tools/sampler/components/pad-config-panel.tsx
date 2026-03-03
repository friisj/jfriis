'use client';

import { useState, useCallback } from 'react';
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
import { updatePad } from '@/lib/sampler';
import { EffectsChain } from './effects-chain';
import { SoundLibraryPicker } from './sound-library-picker';
import { SoundGenerateModal } from './sound-generate-modal';
import type { PadWithSound, PadEffects, PadType, SamplerSound } from '@/lib/types/sampler';

interface PadConfigPanelProps {
  pad: PadWithSound;
  onPadUpdated: (pad: PadWithSound) => void;
  onEffectsChange: (padId: string, effects: PadEffects) => void;
}

export function PadConfigPanel({ pad, onPadUpdated, onEffectsChange }: PadConfigPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
    onEffectsChange(pad.id, effects);
    // Debounced save — update local state immediately, persist async
    updatePad(pad.id, { effects }).catch(console.error);
  }

  return (
    <div className="space-y-6 p-4 overflow-y-auto">
      <div>
        <h3 className="text-sm font-semibold mb-1">
          Pad [{pad.row + 1}, {pad.col + 1}]
        </h3>
        {pad.sound && (
          <p className="text-xs text-muted-foreground">
            Sound: {pad.sound.name}
          </p>
        )}
      </div>

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
            <SelectItem value="toggle">Toggle (on/off)</SelectItem>
            <SelectItem value="loop">Loop</SelectItem>
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

      {/* Effects Chain */}
      <EffectsChain effects={pad.effects} onChange={handleEffectsChange} />

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
    </div>
  );
}
