'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { updateLuvCharacter, createLuvCharacter } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';

interface SoulPersonalityEditorProps {
  characterId: string | null;
  initialSoulData: LuvSoulData;
  initialVersion: number;
}

export function SoulPersonalityEditor({
  characterId,
  initialSoulData,
  initialVersion,
}: SoulPersonalityEditorProps) {
  const [personality, setPersonality] = useState(
    initialSoulData.personality ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [traitInput, setTraitInput] = useState('');

  const updateField = useCallback((field: string, value: unknown) => {
    setPersonality((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addTrait = () => {
    const trimmed = traitInput.trim();
    if (!trimmed) return;
    const traits = personality.traits ?? [];
    if (!traits.includes(trimmed)) {
      updateField('traits', [...traits, trimmed]);
    }
    setTraitInput('');
  };

  const removeTrait = (index: number) => {
    const traits = personality.traits ?? [];
    updateField(
      'traits',
      traits.filter((_, i) => i !== index)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const soulData: LuvSoulData = { ...initialSoulData, personality };
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
      console.error('Failed to save personality:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Label htmlFor="archetype">Archetype</Label>
        <Input
          id="archetype"
          value={personality.archetype ?? ''}
          onChange={(e) => updateField('archetype', e.target.value)}
          placeholder="e.g. Trickster, Sage, Caregiver"
        />
      </div>
      <div>
        <Label htmlFor="temperament">Temperament</Label>
        <Input
          id="temperament"
          value={personality.temperament ?? ''}
          onChange={(e) => updateField('temperament', e.target.value)}
          placeholder="e.g. playful, contemplative, fierce"
        />
      </div>
      <div>
        <Label>Traits</Label>
        <div className="flex gap-2">
          <Input
            value={traitInput}
            onChange={(e) => setTraitInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTrait();
              }
            }}
            placeholder="Add trait and press Enter"
          />
          <Button type="button" variant="outline" size="sm" onClick={addTrait}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {(personality.traits ?? []).map((trait, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => removeTrait(i)}
            >
              {trait} &times;
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
