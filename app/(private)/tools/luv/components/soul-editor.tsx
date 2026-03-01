'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { composeSoulSystemPrompt } from '@/lib/luv-prompt-composer';
import { updateLuvCharacter, createLuvCharacter } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';

interface SoulEditorProps {
  characterId: string | null;
  initialSoulData: LuvSoulData;
  initialVersion: number;
}

export function SoulEditor({
  characterId,
  initialSoulData,
  initialVersion,
}: SoulEditorProps) {
  const [soulData, setSoulData] = useState<LuvSoulData>(initialSoulData);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Tag input helpers
  const [traitInput, setTraitInput] = useState('');
  const [quirkInput, setQuirkInput] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [ruleInput, setRuleInput] = useState('');

  const updateField = useCallback(
    <K extends keyof LuvSoulData>(key: K, value: LuvSoulData[K]) => {
      setSoulData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updatePersonality = useCallback(
    (field: string, value: unknown) => {
      setSoulData((prev) => ({
        ...prev,
        personality: { ...prev.personality, [field]: value },
      }));
    },
    []
  );

  const updateVoice = useCallback((field: string, value: unknown) => {
    setSoulData((prev) => ({
      ...prev,
      voice: { ...prev.voice, [field]: value },
    }));
  }, []);

  const addTag = (
    list: string[] | undefined,
    setter: (tags: string[]) => void,
    value: string,
    clearInput: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = list ?? [];
    if (!current.includes(trimmed)) {
      setter([...current, trimmed]);
    }
    clearInput();
  };

  const removeTag = (
    list: string[] | undefined,
    setter: (tags: string[]) => void,
    index: number
  ) => {
    const current = list ?? [];
    setter(current.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (characterId) {
        await updateLuvCharacter(characterId, {
          soul_data: soulData,
          version: initialVersion + 1,
        });
      } else {
        const created = await createLuvCharacter();
        await updateLuvCharacter(created.id, {
          soul_data: soulData,
        });
      }
      window.location.reload();
    } catch (err) {
      console.error('Failed to save soul data:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const composedPrompt = composeSoulSystemPrompt(soulData);

  // Rule management
  const addRule = () => {
    const trimmed = ruleInput.trim();
    if (!trimmed) return;
    const rules = soulData.rules ?? [];
    updateField('rules', [...rules, trimmed]);
    setRuleInput('');
  };

  const removeRule = (index: number) => {
    const rules = soulData.rules ?? [];
    updateField(
      'rules',
      rules.filter((_, i) => i !== index)
    );
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    const rules = [...(soulData.rules ?? [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= rules.length) return;
    [rules[index], rules[newIndex]] = [rules[newIndex], rules[index]];
    updateField('rules', rules);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Editor Column */}
      <div className="space-y-8">
        {/* Personality */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Personality</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="archetype">Archetype</Label>
              <Input
                id="archetype"
                value={soulData.personality?.archetype ?? ''}
                onChange={(e) => updatePersonality('archetype', e.target.value)}
                placeholder="e.g. Trickster, Sage, Caregiver"
              />
            </div>
            <div>
              <Label htmlFor="temperament">Temperament</Label>
              <Input
                id="temperament"
                value={soulData.personality?.temperament ?? ''}
                onChange={(e) =>
                  updatePersonality('temperament', e.target.value)
                }
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
                      addTag(
                        soulData.personality?.traits,
                        (tags) => updatePersonality('traits', tags),
                        traitInput,
                        () => setTraitInput('')
                      );
                    }
                  }}
                  placeholder="Add trait and press Enter"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    addTag(
                      soulData.personality?.traits,
                      (tags) => updatePersonality('traits', tags),
                      traitInput,
                      () => setTraitInput('')
                    )
                  }
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(soulData.personality?.traits ?? []).map((trait, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() =>
                      removeTag(
                        soulData.personality?.traits,
                        (tags) => updatePersonality('traits', tags),
                        i
                      )
                    }
                  >
                    {trait} &times;
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Voice */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Voice</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tone">Tone</Label>
              <Input
                id="tone"
                value={soulData.voice?.tone ?? ''}
                onChange={(e) => updateVoice('tone', e.target.value)}
                placeholder="e.g. warm, sardonic"
              />
            </div>
            <div>
              <Label htmlFor="formality">Formality</Label>
              <Input
                id="formality"
                value={soulData.voice?.formality ?? ''}
                onChange={(e) => updateVoice('formality', e.target.value)}
                placeholder="e.g. casual, formal"
              />
            </div>
            <div>
              <Label htmlFor="humor">Humor</Label>
              <Input
                id="humor"
                value={soulData.voice?.humor ?? ''}
                onChange={(e) => updateVoice('humor', e.target.value)}
                placeholder="e.g. dry wit, slapstick"
              />
            </div>
            <div>
              <Label htmlFor="warmth">Warmth</Label>
              <Input
                id="warmth"
                value={soulData.voice?.warmth ?? ''}
                onChange={(e) => updateVoice('warmth', e.target.value)}
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
                    addTag(
                      soulData.voice?.quirks,
                      (tags) => updateVoice('quirks', tags),
                      quirkInput,
                      () => setQuirkInput('')
                    );
                  }
                }}
                placeholder="Add quirk and press Enter"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  addTag(
                    soulData.voice?.quirks,
                    (tags) => updateVoice('quirks', tags),
                    quirkInput,
                    () => setQuirkInput('')
                  )
                }
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(soulData.voice?.quirks ?? []).map((quirk, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() =>
                    removeTag(
                      soulData.voice?.quirks,
                      (tags) => updateVoice('quirks', tags),
                      i
                    )
                  }
                >
                  {quirk} &times;
                </Badge>
              ))}
            </div>
          </div>
        </section>

        <Separator />

        {/* Rules */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Rules</h2>
          <div className="flex gap-2">
            <Input
              value={ruleInput}
              onChange={(e) => setRuleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRule();
                }
              }}
              placeholder="Add rule and press Enter"
            />
            <Button type="button" variant="outline" size="sm" onClick={addRule}>
              Add
            </Button>
          </div>
          <ol className="space-y-2">
            {(soulData.rules ?? []).map((rule, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-md border p-2 text-sm"
              >
                <span className="text-muted-foreground w-6 text-right shrink-0">
                  {i + 1}.
                </span>
                <span className="flex-1">{rule}</span>
                <div className="flex gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => moveRule(i, -1)}
                    disabled={i === 0}
                  >
                    &uarr;
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => moveRule(i, 1)}
                    disabled={i === (soulData.rules?.length ?? 0) - 1}
                  >
                    &darr;
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => removeRule(i)}
                  >
                    &times;
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <Separator />

        {/* Skills */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Skills</h2>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag(
                    soulData.skills,
                    (tags) => updateField('skills', tags),
                    skillInput,
                    () => setSkillInput('')
                  );
                }
              }}
              placeholder="Add skill and press Enter"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                addTag(
                  soulData.skills,
                  (tags) => updateField('skills', tags),
                  skillInput,
                  () => setSkillInput('')
                )
              }
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(soulData.skills ?? []).map((skill, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer"
                onClick={() =>
                  removeTag(
                    soulData.skills,
                    (tags) => updateField('skills', tags),
                    i
                  )
                }
              >
                {skill} &times;
              </Badge>
            ))}
          </div>
        </section>

        <Separator />

        {/* Background */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Background</h2>
          <Textarea
            value={soulData.background ?? ''}
            onChange={(e) => updateField('background', e.target.value)}
            placeholder="Character backstory and context..."
            rows={4}
          />
        </section>

        <Separator />

        {/* System Prompt Override */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">System Prompt Override</h2>
          <p className="text-sm text-muted-foreground">
            If set, this replaces the composed prompt entirely.
          </p>
          <Textarea
            value={soulData.system_prompt_override ?? ''}
            onChange={(e) =>
              updateField('system_prompt_override', e.target.value)
            }
            placeholder="Full system prompt override (optional)"
            rows={6}
          />
        </section>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="lg:hidden"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      {/* Preview Column */}
      <div className={`${showPreview ? '' : 'hidden'} lg:block`}>
        <div className="sticky top-20 space-y-4">
          <h2 className="text-lg font-semibold">Composed System Prompt</h2>
          <pre className="whitespace-pre-wrap rounded-lg border bg-muted p-4 text-sm font-mono max-h-[80vh] overflow-y-auto">
            {composedPrompt}
          </pre>
        </div>
      </div>
    </div>
  );
}
