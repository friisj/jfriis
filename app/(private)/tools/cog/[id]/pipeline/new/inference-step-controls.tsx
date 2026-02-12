'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { INFERENCE_STEP_DEFAULTS, type InferenceStepDefault } from '@/lib/ai/inference-defaults';
import type { InferenceStepConfigs, InferenceStepOverride } from '@/lib/types/cog';

interface InferenceStepControlsProps {
  value: InferenceStepConfigs | null;
  onChange: (configs: InferenceStepConfigs | null) => void;
}

const STEP_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;
const THINKING_STEPS = new Set([5, 7]);

function getEffective(step: number, overrides: InferenceStepConfigs | null): InferenceStepDefault & { hasOverride: boolean } {
  const defaults = INFERENCE_STEP_DEFAULTS[step];
  if (!overrides?.[step]) return { ...defaults, hasOverride: false };
  return { ...defaults, ...overrides[step], hasOverride: true };
}

export function InferenceStepControls({ value, onChange }: InferenceStepControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const enabledCount = STEP_NUMBERS.filter(s => getEffective(s, value).enabled).length;
  const hasOverrides = value !== null && Object.keys(value).length > 0;

  function updateStep(step: number, patch: Partial<InferenceStepOverride>) {
    const current = value || {};
    const existing = current[step] || { enabled: INFERENCE_STEP_DEFAULTS[step].enabled };
    const updated = { ...existing, ...patch };

    // Check if this step is now identical to defaults — if so, remove override
    const defaults = INFERENCE_STEP_DEFAULTS[step];
    const isDefault =
      updated.enabled === defaults.enabled &&
      (updated.temperature === undefined || updated.temperature === defaults.temperature) &&
      (updated.max_tokens === undefined || updated.max_tokens === defaults.max_tokens) &&
      (updated.thinking === undefined || updated.thinking === defaults.thinking);

    const newConfigs = { ...current };
    if (isDefault) {
      delete newConfigs[step];
    } else {
      newConfigs[step] = updated;
    }

    // If no overrides remain, set to null
    onChange(Object.keys(newConfigs).length === 0 ? null : newConfigs);
  }

  function handleReset() {
    onChange(null);
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
          <span className="text-sm font-medium">
            Inference Steps ({enabledCount}/7 enabled{hasOverrides ? ', custom' : ''})
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <p className="text-xs text-muted-foreground mb-3">
          Temperature: lower (0.1-0.3) = precise and focused, higher (0.7-1.0) = creative and varied. Max 2.0.
        </p>
        <div className="space-y-1">
          {STEP_NUMBERS.map(step => {
            const effective = getEffective(step, value);
            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-md border px-3 py-1.5 ${!effective.enabled ? 'opacity-40' : ''}`}
              >
                <Switch
                  checked={effective.enabled}
                  onCheckedChange={(checked) => updateStep(step, { enabled: checked })}
                  className="scale-75"
                />
                <span className="text-xs text-muted-foreground font-mono w-4">#{step}</span>
                <span className="text-xs font-medium flex-1 min-w-0 truncate">{effective.label}</span>

                {effective.enabled && (
                  <>
                    <div className="flex items-center gap-1">
                      <Label className="text-[10px] text-muted-foreground">temp</Label>
                      <Input
                        type="number"
                        min={0}
                        max={2}
                        step={0.1}
                        value={effective.temperature}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!isNaN(v) && v >= 0 && v <= 2) {
                            updateStep(step, { temperature: Math.round(v * 10) / 10 });
                          }
                        }}
                        className="w-16 h-6 text-xs px-1.5"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <Label className="text-[10px] text-muted-foreground">tokens</Label>
                      <Input
                        type="number"
                        min={100}
                        max={8000}
                        step={100}
                        value={effective.max_tokens}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          if (!isNaN(v) && v >= 100 && v <= 8000) {
                            updateStep(step, { max_tokens: v });
                          }
                        }}
                        className="w-[72px] h-6 text-xs px-1.5"
                      />
                    </div>

                    {THINKING_STEPS.has(step) && (
                      <div className="flex items-center gap-1">
                        <Label className="text-[10px] text-muted-foreground">think</Label>
                        <Switch
                          checked={effective.thinking}
                          onCheckedChange={(checked) => updateStep(step, { thinking: checked })}
                          className="scale-75"
                        />
                      </div>
                    )}
                  </>
                )}

                {effective.hasOverride && (
                  <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">*</span>
                )}
              </div>
            );
          })}
        </div>

        {hasOverrides && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs mt-2">
            Reset to Defaults
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
