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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';
import { updatePad } from '@/lib/sampler';
import { EffectsChain } from './effects-chain';
import { SoundLibraryPicker } from './sound-library-picker';
import { SoundGenerateModal } from './sound-generate-modal';
import type { PadWithSound, PadEffects, PadType, SamplerSound } from '@/lib/types/sampler';

interface PadConfigPanelProps {
  pad: PadWithSound;
  onPadUpdated: (pad: PadWithSound) => void;
  onEffectsChange: (padId: string, effects: PadEffects) => void;
  onClose: () => void;
}

export function PadConfigPanel({ pad, onPadUpdated, onEffectsChange, onClose }: PadConfigPanelProps) {
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
    updatePad(pad.id, { effects }).catch(console.error);
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

        <TabsContent value="effects" className="overflow-y-auto pt-2">
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
    </div>
  );
}
