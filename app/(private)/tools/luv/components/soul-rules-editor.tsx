'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { updateLuvCharacter, createLuvCharacter } from '@/lib/luv';
import type { LuvSoulData } from '@/lib/types/luv';

interface SoulRulesEditorProps {
  characterId: string | null;
  initialSoulData: LuvSoulData;
  initialVersion: number;
}

export function SoulRulesEditor({
  characterId,
  initialSoulData,
  initialVersion,
}: SoulRulesEditorProps) {
  const [rules, setRules] = useState<string[]>(initialSoulData.rules ?? []);
  const [skills, setSkills] = useState<string[]>(initialSoulData.skills ?? []);
  const [saving, setSaving] = useState(false);
  const [ruleInput, setRuleInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const addRule = () => {
    const trimmed = ruleInput.trim();
    if (!trimmed) return;
    setRules((prev) => [...prev, trimmed]);
    setRuleInput('');
  };

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRule = (index: number, direction: -1 | 1) => {
    setRules((prev) => {
      const next = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (!skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const soulData: LuvSoulData = { ...initialSoulData, rules, skills };
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
      console.error('Failed to save rules:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
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
          {rules.map((rule, i) => (
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
                  disabled={i === rules.length - 1}
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
                addSkill();
              }
            }}
            placeholder="Add skill and press Enter"
          />
          <Button type="button" variant="outline" size="sm" onClick={addSkill}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {skills.map((skill, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => removeSkill(i)}
            >
              {skill} &times;
            </Badge>
          ))}
        </div>
      </section>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
