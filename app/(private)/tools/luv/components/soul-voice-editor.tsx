'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { updateLuvCharacter, createLuvCharacter } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';

interface SoulVoiceEditorProps {
  characterId: string | null;
  initialSoulData: LuvSoulData;
  initialVersion: number;
}

export function SoulVoiceEditor({
  characterId,
  initialSoulData,
  initialVersion,
}: SoulVoiceEditorProps) {
  const [voice, setVoice] = useState(initialSoulData.voice ?? {});
  const [saving, setSaving] = useState(false);
  const [quirkInput, setQuirkInput] = useState('');

  const updateField = useCallback((field: string, value: unknown) => {
    setVoice((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addQuirk = () => {
    const trimmed = quirkInput.trim();
    if (!trimmed) return;
    const quirks = voice.quirks ?? [];
    if (!quirks.includes(trimmed)) {
      updateField('quirks', [...quirks, trimmed]);
    }
    setQuirkInput('');
  };

  const removeQuirk = (index: number) => {
    const quirks = voice.quirks ?? [];
    updateField(
      'quirks',
      quirks.filter((_, i) => i !== index)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const soulData: LuvSoulData = { ...initialSoulData, voice };
      if (characterId) {
        await updateLuvCharacter(characterId, {
          soul_data: soulData,
          version: initialVersion + 1,
        });
      } else {
        const created = await createLuvCharacter();
        await updateLuvCharacter(created.id, { soul_data: soulData });
      }
      window.location.reload();
    } catch (err) {
      console.error('Failed to save voice:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="tone">Tone</Label>
          <Input
            id="tone"
            value={voice.tone ?? ''}
            onChange={(e) => updateField('tone', e.target.value)}
            placeholder="e.g. warm, sardonic"
          />
        </div>
        <div>
          <Label htmlFor="formality">Formality</Label>
          <Input
            id="formality"
            value={voice.formality ?? ''}
            onChange={(e) => updateField('formality', e.target.value)}
            placeholder="e.g. casual, formal"
          />
        </div>
        <div>
          <Label htmlFor="humor">Humor</Label>
          <Input
            id="humor"
            value={voice.humor ?? ''}
            onChange={(e) => updateField('humor', e.target.value)}
            placeholder="e.g. dry wit, slapstick"
          />
        </div>
        <div>
          <Label htmlFor="warmth">Warmth</Label>
          <Input
            id="warmth"
            value={voice.warmth ?? ''}
            onChange={(e) => updateField('warmth', e.target.value)}
            placeholder="e.g. high, reserved"
          />
        </div>
      </div>
      <div>
        <Label>Quirks</Label>
        <div className="flex gap-2">
          <Input
            value={quirkInput}
            onChange={(e) => setQuirkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addQuirk();
              }
            }}
            placeholder="Add quirk and press Enter"
          />
          <Button type="button" variant="outline" size="sm" onClick={addQuirk}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {(voice.quirks ?? []).map((quirk, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => removeQuirk(i)}
            >
              {quirk} &times;
            </Badge>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
