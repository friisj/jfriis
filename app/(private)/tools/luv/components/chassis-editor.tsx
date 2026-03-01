'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { updateLuvCharacter, createLuvCharacter } from '@/lib/luv';
import type { LuvChassisData } from '@/lib/types/luv';

interface ChassisEditorProps {
  characterId: string | null;
  initialChassisData: LuvChassisData;
  initialVersion: number;
}

function KeyValueEditor({
  label,
  data,
  onChange,
}: {
  label: string;
  data: Record<string, string>;
  onChange: (data: Record<string, string>) => void;
}) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const addPair = () => {
    const key = newKey.trim();
    const value = newValue.trim();
    if (!key || !value) return;
    onChange({ ...data, [key]: value });
    setNewKey('');
    setNewValue('');
  };

  const removePair = (key: string) => {
    const next = { ...data };
    delete next[key];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <span className="font-medium min-w-[100px]">{key}:</span>
            <span className="flex-1 text-muted-foreground">{value}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-destructive"
              onClick={() => removePair(key)}
            >
              &times;
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Key"
          className="flex-1"
        />
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addPair();
            }
          }}
          placeholder="Value"
          className="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onClick={addPair}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function ChassisEditor({
  characterId,
  initialChassisData,
  initialVersion,
}: ChassisEditorProps) {
  const [chassisData, setChassisData] =
    useState<LuvChassisData>(initialChassisData);
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [featureInput, setFeatureInput] = useState('');

  const updateField = useCallback(
    <K extends keyof LuvChassisData>(key: K, value: LuvChassisData[K]) => {
      setChassisData((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      let data = chassisData;
      if (showJson) {
        try {
          data = JSON.parse(jsonText);
        } catch {
          alert('Invalid JSON');
          setSaving(false);
          return;
        }
      }

      if (characterId) {
        await updateLuvCharacter(characterId, {
          chassis_data: data,
          version: initialVersion + 1,
        });
      } else {
        const created = await createLuvCharacter();
        await updateLuvCharacter(created.id, { chassis_data: data });
      }
      window.location.reload();
    } catch (err) {
      console.error('Failed to save chassis data:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const toggleJson = () => {
    if (!showJson) {
      setJsonText(JSON.stringify(chassisData, null, 2));
    } else {
      try {
        setChassisData(JSON.parse(jsonText));
      } catch {
        // keep existing data if JSON is invalid
      }
    }
    setShowJson(!showJson);
  };

  if (showJson) {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Raw JSON</h2>
          <Button variant="outline" size="sm" onClick={toggleJson}>
            Switch to Form
          </Button>
        </div>
        <Textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={20}
          className="font-mono text-sm"
        />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={toggleJson}>
          Switch to JSON
        </Button>
      </div>

      {/* Face */}
      <section>
        <KeyValueEditor
          label="Face"
          data={(chassisData.face as Record<string, string>) ?? {}}
          onChange={(data) => updateField('face', data)}
        />
      </section>

      <Separator />

      {/* Body */}
      <section>
        <KeyValueEditor
          label="Body"
          data={(chassisData.body as Record<string, string>) ?? {}}
          onChange={(data) => updateField('body', data)}
        />
      </section>

      <Separator />

      {/* Coloring */}
      <section>
        <KeyValueEditor
          label="Coloring"
          data={(chassisData.coloring as Record<string, string>) ?? {}}
          onChange={(data) => updateField('coloring', data)}
        />
      </section>

      <Separator />

      {/* Age Appearance */}
      <section className="space-y-3">
        <Label htmlFor="age_appearance">Age Appearance</Label>
        <Input
          id="age_appearance"
          value={chassisData.age_appearance ?? ''}
          onChange={(e) => updateField('age_appearance', e.target.value)}
          placeholder="e.g. young adult, ageless"
        />
      </section>

      <Separator />

      {/* Distinguishing Features */}
      <section className="space-y-3">
        <Label>Distinguishing Features</Label>
        <div className="flex gap-2">
          <Input
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = featureInput.trim();
                if (!trimmed) return;
                const features = chassisData.distinguishing_features ?? [];
                if (!features.includes(trimmed)) {
                  updateField('distinguishing_features', [
                    ...features,
                    trimmed,
                  ]);
                }
                setFeatureInput('');
              }
            }}
            placeholder="Add feature and press Enter"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const trimmed = featureInput.trim();
              if (!trimmed) return;
              const features = chassisData.distinguishing_features ?? [];
              if (!features.includes(trimmed)) {
                updateField('distinguishing_features', [...features, trimmed]);
              }
              setFeatureInput('');
            }}
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {(chassisData.distinguishing_features ?? []).map((feature, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => {
                const features = chassisData.distinguishing_features ?? [];
                updateField(
                  'distinguishing_features',
                  features.filter((_, idx) => idx !== i)
                );
              }}
            >
              {feature} &times;
            </Badge>
          ))}
        </div>
      </section>

      <div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
