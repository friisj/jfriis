'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
      <CollapsibleContent className="space-y-3 pt-2">
        {STEP_NUMBERS.map(step => {
          const effective = getEffective(step, value);
          return (
            <div
              key={step}
              className={`rounded-md border p-3 space-y-2 ${!effective.enabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Switch
                  checked={effective.enabled}
                  onCheckedChange={(checked) => updateStep(step, { enabled: checked })}
                />
                <span className="text-xs text-muted-foreground font-mono">#{step}</span>
                <span className="text-sm font-medium flex-1">{effective.label}</span>
                {effective.hasOverride && (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">custom</span>
                )}
              </div>

              {effective.enabled && (
                <div className="flex items-center gap-4 pl-12">
                  {/* Temperature */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Temp</Label>
                    <Slider
                      min={0}
                      max={2}
                      step={0.1}
                      value={[effective.temperature]}
                      onValueChange={([v]) => updateStep(step, { temperature: Math.round(v * 10) / 10 })}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono w-8 text-right">{effective.temperature.toFixed(1)}</span>
                  </div>

                  {/* Max Tokens */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Tokens</Label>
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
                      className="w-20 h-7 text-xs"
                    />
                  </div>

                  {/* Thinking toggle (steps 5, 7 only) */}
                  {THINKING_STEPS.has(step) && (
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Think</Label>
                      <Switch
                        checked={effective.thinking}
                        onCheckedChange={(checked) => updateStep(step, { thinking: checked })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {hasOverrides && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
            Reset to Defaults
          </Button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
