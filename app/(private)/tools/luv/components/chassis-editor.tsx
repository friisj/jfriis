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
import type { LuvChassisModule } from '@/lib/types/luv-chassis';
import { ModuleEditor } from './module-editor';

interface ChassisEditorProps {
  characterId: string | null;
  initialChassisData: LuvChassisData;
  initialVersion: number;
  modules: LuvChassisModule[];
}

type ViewMode = 'modules' | 'legacy' | 'json';

export function ChassisEditor({
  characterId,
  initialChassisData,
  initialVersion,
  modules,
}: ChassisEditorProps) {
  const [chassisData, setChassisData] =
    useState<LuvChassisData>(initialChassisData);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(
    modules.length > 0 ? 'modules' : 'legacy'
  );
  const [jsonText, setJsonText] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(
    modules[0]?.id ?? null
  );
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
      if (viewMode === 'json') {
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
    if (viewMode !== 'json') {
      setJsonText(JSON.stringify(chassisData, null, 2));
      setViewMode('json');
    } else {
      try {
        setChassisData(JSON.parse(jsonText));
      } catch {
        // keep existing data if JSON is invalid
      }
      setViewMode(modules.length > 0 ? 'modules' : 'legacy');
    }
  };

  // Group modules by category
  const categories = new Map<string, LuvChassisModule[]>();
  for (const mod of modules) {
    const cat = categories.get(mod.category) ?? [];
    cat.push(mod);
    categories.set(mod.category, cat);
  }

  const selectedModule = modules.find((m) => m.id === selectedModuleId);

  // JSON editor
  if (viewMode === 'json') {
    return (
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Raw JSON</h2>
          <Button variant="outline" size="sm" onClick={toggleJson}>
            Back
          </Button>
        </div>
        <Textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={20}
          className="font-mono text-sm"
        />
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Legacy Data'}
        </Button>
      </div>
    );
  }

  // Module editor
  if (viewMode === 'modules' && modules.length > 0) {
    return (
      <div className="flex gap-6">
        {/* Module list */}
        <div className="w-48 shrink-0 space-y-4">
          {Array.from(categories.entries()).map(([cat, mods]) => (
            <div key={cat}>
              <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {cat}
              </h4>
              <div className="space-y-0.5">
                {mods.map((mod) => (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setSelectedModuleId(mod.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      mod.id === selectedModuleId
                        ? 'bg-accent font-medium'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {mod.name}
                    <Badge variant="outline" className="ml-1 text-[8px] px-1">
                      v{mod.current_version}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Separator />

          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={() => setViewMode('legacy')}
            >
              Legacy Editor
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={toggleJson}
            >
              Raw JSON
            </Button>
          </div>
        </div>

        {/* Editor panel */}
        <div className="flex-1 max-w-xl">
          {selectedModule ? (
            <ModuleEditor
              key={selectedModule.id}
              module={selectedModule}
              onSaved={() => window.location.reload()}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a module to edit.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Legacy key-value editor (fallback)
  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex justify-end gap-2">
        {modules.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('modules')}
          >
            Module Editor
          </Button>
        )}
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
