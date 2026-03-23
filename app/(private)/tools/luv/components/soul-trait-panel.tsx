'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { IconLoader2 } from '@tabler/icons-react';
import { SOUL_TRAITS, type SoulTrait, type SoulTraits } from '@/lib/luv/soul-modulation';
import { getLuvCharacter } from '@/lib/luv';

const TRAIT_META: Record<SoulTrait, { label: string; low: string; high: string }> = {
  honesty: { label: 'Honesty', low: 'Diplomatic', high: 'Brutally direct' },
  humor: { label: 'Humor', low: 'Professional', high: 'Irreverent' },
  deference: { label: 'Deference', low: 'Assertive', high: 'Collaborative' },
  formality: { label: 'Formality', low: 'Casual', high: 'Academic' },
  enthusiasm: { label: 'Enthusiasm', low: 'Reserved', high: 'Effusive' },
  risk_taking: { label: 'Risk-Taking', low: 'Conservative', high: 'Experimental' },
  charm: { label: 'Charm', low: 'Matter-of-fact', high: 'Enchanting' },
};

interface SoulTraitPanelProps {
  onClose: () => void;
  onTraitsApplied: (changes: string) => void;
}

export function SoulTraitPanel({ onClose, onTraitsApplied }: SoulTraitPanelProps) {
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [traits, setTraits] = useState<SoulTraits | null>(null);
  const [savedTraits, setSavedTraits] = useState<SoulTraits | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const char = await getLuvCharacter();
        if (!char) return;
        setCharacterId(char.id);

        const res = await fetch(`/api/luv/soul/config?characterId=${char.id}`);
        if (!res.ok) return;
        const data = await res.json();
        setTraits(data.traits);
        setSavedTraits(data.traits);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleTraitChange = useCallback((trait: SoulTrait, value: number) => {
    setTraits((prev) => (prev ? { ...prev, [trait]: value } : prev));
  }, []);

  const hasChanges = traits && savedTraits && SOUL_TRAITS.some((t) => traits[t] !== savedTraits[t]);

  const handleSave = useCallback(async () => {
    if (!characterId || !traits || !savedTraits || !hasChanges) return;
    setSaving(true);

    const patch: Partial<SoulTraits> = {};
    const changeDescriptions: string[] = [];
    for (const t of SOUL_TRAITS) {
      if (traits[t] !== savedTraits[t]) {
        patch[t] = traits[t];
        changeDescriptions.push(`${TRAIT_META[t].label} ${savedTraits[t]}→${traits[t]}`);
      }
    }

    try {
      const res = await fetch('/api/luv/soul/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId,
          patch,
          modified_by: 'user',
          note: `Manual adjustment: ${changeDescriptions.join(', ')}`,
        }),
      });

      if (res.ok) {
        setSavedTraits({ ...traits });
        onTraitsApplied(changeDescriptions.join(', '));
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }, [characterId, traits, savedTraits, hasChanges, onTraitsApplied, onClose]);

  const handleReset = useCallback(() => {
    if (savedTraits) setTraits({ ...savedTraits });
  }, [savedTraits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <IconLoader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!traits) return null;

  return (
    <>
      <div className="px-3 py-3 space-y-4">
        {SOUL_TRAITS.map((trait) => (
          <TraitSlider
            key={trait}
            trait={trait}
            value={traits[trait]}
            savedValue={savedTraits?.[trait] ?? traits[trait]}
            onChange={handleTraitChange}
          />
        ))}
      </div>
      {hasChanges && (
        <div className="flex gap-2 px-3 py-2 border-t shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 flex-1"
            onClick={handleReset}
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            size="sm"
            className="text-xs h-7 flex-1"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <IconLoader2 size={12} className="animate-spin mr-1" /> : null}
            Apply
          </Button>
        </div>
      )}
    </>
  );
}

function TraitSlider({
  trait,
  value,
  savedValue,
  onChange,
}: {
  trait: SoulTrait;
  value: number;
  savedValue: number;
  onChange: (trait: SoulTrait, value: number) => void;
}) {
  const meta = TRAIT_META[trait];
  const changed = value !== savedValue;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 select-none">
        <span className={`text-xs ${changed ? 'text-foreground' : 'text-muted-foreground'}`}>
          {meta.label}
        </span>
        <span className={`font-mono text-xs tabular-nums ${changed ? 'text-foreground' : 'text-muted-foreground'}`}>
          {changed && <span className="text-muted-foreground line-through mr-1">{savedValue}</span>}
          {value}
        </span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(trait, v)}
      />
      <div className="flex justify-between px-1 select-none">
        <span className="text-[10px] font-mono text-muted-foreground">{meta.low}</span>
        <span className="text-[10px] font-mono text-muted-foreground">{meta.high}</span>
      </div>
    </div>
  );
}
