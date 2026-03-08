'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { buildTemplateContext, renderTemplate } from '@/lib/luv/template-engine';
import { createContextPack } from '@/lib/luv-chassis';
import type { LuvChassisModule, EvaluationCriterion } from '@/lib/types/luv-chassis';

interface ContextPackComposerProps {
  module: LuvChassisModule;
  allModules?: LuvChassisModule[];
  onCreated?: () => void;
}

export function ContextPackComposer({
  module,
  allModules = [],
  onCreated,
}: ContextPackComposerProps) {
  const paramSchema = module.parameter_schema ?? [];
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Build default generation prompt from module parameters
  const defaultPrompt = useMemo(() => {
    if (paramSchema.length === 0) return '';
    const lines: string[] = [`${module.name} specifications:`];
    for (const p of paramSchema) {
      lines.push(`- ${p.label}: {{modules.${module.slug}.${p.key}}}`);
    }
    return lines.join('\n');
  }, [paramSchema, module.name, module.slug]);

  const [prompt, setPrompt] = useState(defaultPrompt);

  // Build evaluation criteria from parameters
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(() => {
    if (paramSchema.length === 0) return [];
    return paramSchema.map((p) => ({
      parameterKey: p.key,
      label: p.label,
      expectedValue: formatParamValue(module.parameters[p.key]),
      passed: undefined,
    }));
  });

  const toggleCriterion = (idx: number) => {
    setCriteria((prev) =>
      prev.map((c, i) =>
        i === idx ? { ...c, passed: c.passed === undefined ? true : undefined } : c
      )
    );
  };

  // Preview rendered prompt
  const renderedPrompt = useMemo(() => {
    const ctx = buildTemplateContext(
      undefined,
      undefined,
      allModules.length > 0 ? allModules : [module]
    );
    return renderTemplate(prompt, ctx);
  }, [prompt, module, allModules]);

  const activeCriteria = criteria.filter((c) => c.passed !== undefined || c.expectedValue);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createContextPack({
        module_id: module.id,
        version: module.current_version,
        generation_prompt: prompt,
        evaluation_criteria: activeCriteria,
        status: 'draft',
      });
      onCreated?.();
    } catch (err) {
      console.error('Failed to create context pack:', err);
    } finally {
      setSaving(false);
    }
  };

  if (paramSchema.length === 0) return null;

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Context Pack Composer
      </h4>

      <div className="space-y-2">
        <Label className="text-xs">Generation Prompt Template</Label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={8}
          className="text-xs font-mono"
          placeholder="Use {{modules.slug.param}} for interpolation..."
        />
        <div className="flex items-center gap-2">
          <Switch
            checked={showPreview}
            onCheckedChange={setShowPreview}
            id="preview-toggle"
          />
          <Label htmlFor="preview-toggle" className="text-xs">
            Show rendered preview
          </Label>
        </div>
        {showPreview && (
          <div className="rounded border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap">
            {renderedPrompt}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Evaluation Criteria</Label>
        <p className="text-[10px] text-muted-foreground">
          Select which parameters to verify in generated output.
        </p>
        <div className="space-y-1">
          {criteria.map((c, i) => (
            <div
              key={c.parameterKey}
              className="flex items-center gap-2 rounded border px-2 py-1.5"
            >
              <Switch
                checked={c.passed !== undefined}
                onCheckedChange={() => toggleCriterion(i)}
                className="scale-75"
              />
              <span className="text-xs flex-1">
                Verify <span className="font-medium">{c.label}</span> matches{' '}
                <Badge variant="outline" className="text-[10px]">
                  {c.expectedValue || '(unset)'}
                </Badge>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Creating...' : 'Create Context Pack'}
        </Button>
        <span className="text-[10px] text-muted-foreground">
          Targeting v{module.current_version}
        </span>
      </div>
    </div>
  );
}

function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
