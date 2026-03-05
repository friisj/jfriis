'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { createStudy, updateStudy } from '@/lib/luv-chassis';
import type {
  LuvChassisStudy,
  StudyFinding,
  ParameterConstraint,
} from '@/lib/types/luv-chassis';
import type { LuvChassisModule } from '@/lib/types/luv-chassis';

interface StudyEditorProps {
  study?: LuvChassisStudy;
  modules?: LuvChassisModule[];
}

export function StudyEditor({ study, modules = [] }: StudyEditorProps) {
  const router = useRouter();
  const isNew = !study;

  const [title, setTitle] = useState(study?.title ?? '');
  const [slug, setSlug] = useState(study?.slug ?? '');
  const [focusArea, setFocusArea] = useState(study?.focus_area ?? '');
  const [moduleId, setModuleId] = useState(study?.module_id ?? '');
  const [status, setStatus] = useState<'in_progress' | 'completed'>(study?.status ?? 'in_progress');
  const [findings, setFindings] = useState<StudyFinding[]>(study?.findings ?? []);
  const [constraints, setConstraints] = useState<Record<string, ParameterConstraint>>(
    study?.parameter_constraints ?? {}
  );
  const [saving, setSaving] = useState(false);

  // Selected module's schema for constraint editing
  const selectedModule = modules.find((m) => m.id === moduleId);
  const parameterSchema = selectedModule?.parameter_schema ?? [];

  const addFinding = () => {
    setFindings((prev) => [...prev, { observation: '', source: '', implications: '' }]);
  };

  const updateFinding = (idx: number, field: keyof StudyFinding, value: string) => {
    setFindings((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f))
    );
  };

  const removeFinding = (idx: number) => {
    setFindings((prev) => prev.filter((_, i) => i !== idx));
  };

  const addConstraint = (paramKey: string) => {
    if (parameterSchema.length === 0) return;
    const param = parameterSchema.find((p) => p.key === paramKey);
    if (!param) return;
    setConstraints((prev) => ({
      ...prev,
      [paramKey]: { parameterKey: paramKey, value: '', reason: '' },
    }));
  };

  const updateConstraint = (key: string, field: keyof ParameterConstraint, value: unknown) => {
    setConstraints((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const removeConstraint = (key: string) => {
    setConstraints((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await createStudy({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          module_id: moduleId || undefined,
          focus_area: focusArea,
          findings,
          parameter_constraints: constraints,
          status,
        });
        router.push('/tools/luv/studies');
      } else {
        await updateStudy(study.id, {
          title,
          focus_area: focusArea,
          findings,
          parameter_constraints: constraints,
          status,
        });
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to save study:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Dental Anatomy Study"
            className="text-xs h-8"
          />
        </div>

        {isNew && (
          <div className="space-y-1">
            <Label className="text-xs">Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="auto-generated from title"
              className="text-xs h-8 font-mono"
            />
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Focus Area</Label>
          <Input
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
            placeholder="e.g., dental anatomy, hand gesture range"
            className="text-xs h-8"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Module (optional)</Label>
            <Select value={moduleId || '__none__'} onValueChange={(v) => setModuleId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Cross-module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">Cross-module</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as 'in_progress' | 'completed')}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Findings
          </h4>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={addFinding}>
            <Plus className="h-3 w-3 mr-1" />
            Add Finding
          </Button>
        </div>
        {findings.map((f, i) => (
          <div key={i} className="rounded border p-2 space-y-1.5">
            <div className="flex items-start gap-1">
              <Textarea
                value={f.observation}
                onChange={(e) => updateFinding(i, 'observation', e.target.value)}
                placeholder="Observation..."
                rows={2}
                className="text-xs flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => removeFinding(i)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Input
                value={f.source ?? ''}
                onChange={(e) => updateFinding(i, 'source', e.target.value)}
                placeholder="Source"
                className="text-[10px] h-6"
              />
              <Input
                value={f.implications ?? ''}
                onChange={(e) => updateFinding(i, 'implications', e.target.value)}
                placeholder="Implications"
                className="text-[10px] h-6"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Parameter Constraints */}
      {parameterSchema.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Parameter Constraints
            </h4>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Lock parameters based on study findings. Locked params appear read-only in the module editor.
          </p>

          {Object.entries(constraints).map(([key, c]) => (
            <div key={key} className="flex items-center gap-2 rounded border px-2 py-1.5">
              <Badge variant="outline" className="text-[10px]">{key}</Badge>
              <Input
                value={String(c.value)}
                onChange={(e) => updateConstraint(key, 'value', e.target.value)}
                placeholder="Locked value"
                className="text-[10px] h-6 flex-1"
              />
              <Input
                value={c.reason}
                onChange={(e) => updateConstraint(key, 'reason', e.target.value)}
                placeholder="Reason"
                className="text-[10px] h-6 flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => removeConstraint(key)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Add constraint from available params */}
          {parameterSchema
            .filter((p) => !(p.key in constraints))
            .length > 0 && (
            <Select onValueChange={addConstraint}>
              <SelectTrigger className="text-xs h-7 w-48">
                <SelectValue placeholder="Lock parameter..." />
              </SelectTrigger>
              <SelectContent>
                {parameterSchema
                  .filter((p) => !(p.key in constraints))
                  .map((p) => (
                    <SelectItem key={p.key} value={p.key} className="text-xs">
                      {p.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || !title.trim()} size="sm">
        {saving ? 'Saving...' : isNew ? 'Create Study' : 'Save Study'}
      </Button>
    </div>
  );
}
