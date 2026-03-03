'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateLuvCharacter, createLuvCharacter } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';

interface SoulOverridesEditorProps {
  characterId: string | null;
  initialSoulData: LuvSoulData;
  initialVersion: number;
}

export function SoulOverridesEditor({
  characterId,
  initialSoulData,
  initialVersion,
}: SoulOverridesEditorProps) {
  const [background, setBackground] = useState(
    initialSoulData.background ?? ''
  );
  const [systemPromptOverride, setSystemPromptOverride] = useState(
    initialSoulData.system_prompt_override ?? ''
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const soulData: LuvSoulData = {
        ...initialSoulData,
        background,
        system_prompt_override: systemPromptOverride,
      };
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
      console.error('Failed to save overrides:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      {/* Background */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Background</h2>
        <Textarea
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          placeholder="Character backstory and context..."
          rows={4}
        />
      </section>

      {/* System Prompt Override */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">System Prompt Override</h2>
        <p className="text-sm text-muted-foreground">
          If set, this replaces the composed prompt entirely.
        </p>
        <Textarea
          value={systemPromptOverride}
          onChange={(e) => setSystemPromptOverride(e.target.value)}
          placeholder="Full system prompt override (optional)"
          rows={6}
        />
      </section>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
