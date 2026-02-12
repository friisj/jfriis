'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

export function getEnabledStepCount(value: InferenceStepConfigs | null): number {
  return STEP_NUMBERS.filter(s => getEffective(s, value).enabled).length;
}

export function InferenceStepControls({ value, onChange }: InferenceStepControlsProps) {
  const hasOverrides = value !== null && Object.keys(value).length > 0;

  function updateStep(step: number, patch: Partial<InferenceStepOverride>) {
    const current = value || {};
    const existing = current[step] || { enabled: INFERENCE_STEP_DEFAULTS[step].enabled };
    const updated = { ...existing, ...patch };

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

    onChange(Object.keys(newConfigs).length === 0 ? null : newConfigs);
  }

  return (
    <div>
      <div className="space-y-1">
        {STEP_NUMBERS.map(step => {
          const effective = getEffective(step, value);
          return (
            <div
              key={step}
              className={`flex items-center gap-2 rounded-md border pl-2 pr-1.5 py-1.5 ${!effective.enabled ? 'opacity-40' : ''}`}
            >
              <Switch
                checked={effective.enabled}
                onCheckedChange={(checked) => updateStep(step, { enabled: checked })}
                className="scale-75"
              />
              <span className="text-xs font-medium min-w-0 truncate">{effective.label}</span>

              <div className="flex items-center flex-1 justify-end gap-8">
                {effective.enabled && (
                  <>
                    {THINKING_STEPS.has(step) ? (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`think-${step}`} className="text-[10px] font-mono text-muted-foreground cursor-pointer">Thinking</Label>
                        <Checkbox
                          id={`think-${step}`}
                          checked={effective.thinking}
                          onCheckedChange={(checked) => updateStep(step, { thinking: checked === true })}
                          className="h-3.5 w-3.5"
                        />
                      </div>
                    ) : (
                      <div className="w-[46px]" />
                    )}

                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] font-mono text-muted-foreground">Temperature</Label>
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
                        className="w-16 h-6 md:text-xs px-1.5 md:text-mono md:tabular-nums"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] font-mono text-muted-foreground">Tokens</Label>
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
                        className="w-[72px] h-6 md:text-xs px-1.5 md:text-mono md:tabular-nums"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center pt-1">
        {hasOverrides && (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)} className="text-xs">
            Reset to Defaults
          </Button>
        )}
        <p className="text-xs text-muted-foreground ml-auto px-2">
          Lower temperature = precise, higher = creative (0–2)
        </p>
      </div>
    </div>
  );
}
