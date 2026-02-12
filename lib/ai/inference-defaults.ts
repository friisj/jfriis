import type { InferenceStepConfigs } from '@/lib/types/cog';

export interface InferenceStepDefault {
  label: string;
  enabled: boolean;
  temperature: number;
  max_tokens: number;
  thinking: boolean;
}

export const INFERENCE_STEP_DEFAULTS: Record<number, InferenceStepDefault> = {
  1: { label: 'Context Translation',    enabled: true, temperature: 0.7, max_tokens: 1200, thinking: false },
  2: { label: 'Photographer Concept',   enabled: true, temperature: 0.7, max_tokens: 1200, thinking: false },
  3: { label: 'Director Briefing',      enabled: true, temperature: 0.7, max_tokens: 1200, thinking: false },
  4: { label: 'Production Constraints', enabled: true, temperature: 0.7, max_tokens: 1200, thinking: false },
  5: { label: 'Creative Synthesis',     enabled: true, temperature: 0.8, max_tokens: 2000, thinking: true },
  6: { label: 'Vision Analysis',        enabled: true, temperature: 0.3, max_tokens: 800,  thinking: false },
  7: { label: 'Final Prompt',           enabled: true, temperature: 0.8, max_tokens: 2000, thinking: true },
};

export function getStepConfig(step: number, overrides: InferenceStepConfigs | null): InferenceStepDefault {
  const defaults = INFERENCE_STEP_DEFAULTS[step];
  if (!overrides?.[step]) return defaults;
  return { ...defaults, ...overrides[step] };
}
