'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { updateChassisModule } from '@/lib/luv-chassis';
import type { ParameterDef, ParameterType, ParameterTier, MeasurementUnit } from '@/lib/types/luv-chassis';

const PARAMETER_TYPES: { value: ParameterType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'range', label: 'Range (slider)' },
  { value: 'color', label: 'Color' },
  { value: 'enum', label: 'Enum (dropdown)' },
  { value: 'boolean', label: 'Boolean (toggle)' },
  { value: 'json', label: 'JSON' },
  { value: 'media_ref', label: 'Media Reference' },
  { value: 'measurement', label: 'Measurement' },
  { value: 'ratio', label: 'Ratio' },
  { value: 'constraint_range', label: 'Constraint Range' },
];

const TIERS: ParameterTier[] = ['basic', 'intermediate', 'advanced', 'clinical'];
const UNITS: MeasurementUnit[] = ['cm', 'in', 'mm', 'degrees', 'ratio', 'percent'];

interface ModuleSchemaEditorProps {
  moduleId: string;
  parameterSchema: ParameterDef[];
  onSaved?: () => void;
}

function emptyParam(): ParameterDef {
  return { key: '', label: '', type: 'text', tier: 'basic' };
}

export function ModuleSchemaEditor({ moduleId, parameterSchema, onSaved }: ModuleSchemaEditorProps) {
  const [params, setParams] = useState<ParameterDef[]>(parameterSchema);
  const [saving, setSaving] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newParam, setNewParam] = useState<ParameterDef>(emptyParam());

  const updateParam = (idx: number, updates: Partial<ParameterDef>) => {
    setParams((prev) => prev.map((p, i) => (i === idx ? { ...p, ...updates } : p)));
  };

  const removeParam = (idx: number) => {
    setParams((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  const moveParam = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= params.length) return;
    setParams((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    setExpandedIdx(target);
  };

  const addParam = () => {
    if (!newParam.key.trim() || !newParam.label.trim()) return;
    setParams((prev) => [...prev, { ...newParam, key: newParam.key.trim(), label: newParam.label.trim() }]);
    setNewParam(emptyParam());
    setAdding(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateChassisModule(moduleId, { parameter_schema: params });
      onSaved?.();
    } catch (err) {
      console.error('Failed to save schema:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(params) !== JSON.stringify(parameterSchema);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Parameter Schema
        </h4>
        <Badge variant="outline" className="text-[10px]">
          {params.length} parameter{params.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {params.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground">No parameters defined yet.</p>
      )}

      <div className="space-y-1">
        {params.map((param, idx) => {
          const isExpanded = expandedIdx === idx;
          return (
            <Collapsible
              key={`${param.key}-${idx}`}
              open={isExpanded}
              onOpenChange={(open) => setExpandedIdx(open ? idx : null)}
            >
              <div className="rounded border px-3 py-2">
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors flex-1 text-left">
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      <span className="font-medium">{param.label}</span>
                      <Badge variant="secondary" className="text-[10px]">{param.type}</Badge>
                      {param.tier && param.tier !== 'basic' && (
                        <Badge variant="outline" className="text-[10px]">{param.tier}</Badge>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <code className="text-[10px] text-muted-foreground">{param.key}</code>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost" size="sm" className="h-5 w-5 p-0"
                      onClick={() => moveParam(idx, -1)} disabled={idx === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="sm" className="h-5 w-5 p-0"
                      onClick={() => moveParam(idx, 1)} disabled={idx === params.length - 1}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <CollapsibleContent>
                  <ParamEditor param={param} onChange={(u) => updateParam(idx, u)} onRemove={() => removeParam(idx)} />
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {adding ? (
        <div className="rounded border p-3 space-y-2">
          <p className="text-xs font-medium">Add Parameter</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px]">Key</Label>
              <Input
                value={newParam.key}
                onChange={(e) => setNewParam((p) => ({ ...p, key: e.target.value }))}
                placeholder="e.g., iris_color"
                className="text-xs h-7 font-mono"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px]">Label</Label>
              <Input
                value={newParam.label}
                onChange={(e) => setNewParam((p) => ({ ...p, label: e.target.value }))}
                placeholder="e.g., Iris Color"
                className="text-xs h-7"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label className="text-[10px]">Type</Label>
              <Select
                value={newParam.type}
                onValueChange={(v) => setNewParam((p) => ({ ...p, type: v as ParameterType }))}
              >
                <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PARAMETER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px]">Tier</Label>
              <Select
                value={newParam.tier ?? 'basic'}
                onValueChange={(v) => setNewParam((p) => ({ ...p, tier: v as ParameterTier }))}
              >
                <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIERS.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Description (optional)</Label>
            <Input
              value={newParam.description ?? ''}
              onChange={(e) => setNewParam((p) => ({ ...p, description: e.target.value || undefined }))}
              placeholder="What this parameter controls"
              className="text-xs h-7"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={addParam} disabled={!newParam.key.trim() || !newParam.label.trim()}>
              Add
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAdding(false); setNewParam(emptyParam()); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Add Parameter
        </Button>
      )}

      {hasChanges && (
        <div className="flex items-center gap-2 pt-1">
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Save Schema'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setParams(parameterSchema)}>
            Discard
          </Button>
        </div>
      )}
    </div>
  );
}

// Inline editor for a single parameter's properties
function ParamEditor({
  param,
  onChange,
  onRemove,
}: {
  param: ParameterDef;
  onChange: (updates: Partial<ParameterDef>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-2 pt-2 border-t space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px]">Key</Label>
          <Input value={param.key} onChange={(e) => onChange({ key: e.target.value })} className="text-xs h-7 font-mono" />
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px]">Label</Label>
          <Input value={param.label} onChange={(e) => onChange({ label: e.target.value })} className="text-xs h-7" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <Label className="text-[10px]">Type</Label>
          <Select value={param.type} onValueChange={(v) => onChange({ type: v as ParameterType })}>
            <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PARAMETER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-0.5">
          <Label className="text-[10px]">Tier</Label>
          <Select value={param.tier ?? 'basic'} onValueChange={(v) => onChange({ tier: v as ParameterTier })}>
            <SelectTrigger className="text-xs h-7"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIERS.map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-0.5">
        <Label className="text-[10px]">Description</Label>
        <Input
          value={param.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
          className="text-xs h-7"
        />
      </div>

      {/* Type-conditional fields */}
      {param.type === 'enum' && (
        <div className="space-y-0.5">
          <Label className="text-[10px]">Options (comma-separated)</Label>
          <Input
            value={(param.options ?? []).join(', ')}
            onChange={(e) => onChange({ options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="option1, option2, option3"
            className="text-xs h-7 font-mono"
          />
        </div>
      )}

      {(param.type === 'number' || param.type === 'range' || param.type === 'measurement' || param.type === 'ratio' || param.type === 'constraint_range') && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Min</Label>
            <Input
              type="number"
              value={param.min ?? ''}
              onChange={(e) => onChange({ min: e.target.value ? Number(e.target.value) : undefined })}
              className="text-xs h-7"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Max</Label>
            <Input
              type="number"
              value={param.max ?? ''}
              onChange={(e) => onChange({ max: e.target.value ? Number(e.target.value) : undefined })}
              className="text-xs h-7"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Step</Label>
            <Input
              type="number"
              value={param.step ?? ''}
              onChange={(e) => onChange({ step: e.target.value ? Number(e.target.value) : undefined })}
              className="text-xs h-7"
            />
          </div>
        </div>
      )}

      {param.type === 'measurement' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Units (comma-separated)</Label>
            <Input
              value={(param.units ?? []).join(', ')}
              onChange={(e) => onChange({ units: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) as MeasurementUnit[] })}
              placeholder="cm, in, mm"
              className="text-xs h-7 font-mono"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Default Unit</Label>
            <Select value={param.defaultUnit ?? ''} onValueChange={(v) => onChange({ defaultUnit: v as MeasurementUnit })}>
              <SelectTrigger className="text-xs h-7"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {UNITS.map((u) => (
                  <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {param.type === 'ratio' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Label A</Label>
            <Input
              value={param.ratioLabels?.[0] ?? ''}
              onChange={(e) => onChange({ ratioLabels: [e.target.value, param.ratioLabels?.[1] ?? 'B'] })}
              className="text-xs h-7"
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px]">Label B</Label>
            <Input
              value={param.ratioLabels?.[1] ?? ''}
              onChange={(e) => onChange({ ratioLabels: [param.ratioLabels?.[0] ?? 'A', e.target.value] })}
              className="text-xs h-7"
            />
          </div>
        </div>
      )}

      <div className="pt-1">
        <Button variant="destructive" size="sm" className="h-6 text-[10px]" onClick={onRemove}>
          <Trash2 className="h-3 w-3 mr-1" />
          Remove Parameter
        </Button>
      </div>
    </div>
  );
}
