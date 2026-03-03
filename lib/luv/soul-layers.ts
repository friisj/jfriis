/**
 * Luv: Soul Layer Types
 *
 * Defines the 7-layer composition model for Luv's system prompt.
 * Layers are ordered by priority (lowest → highest), with later layers
 * taking precedence in the composed prompt.
 */

export type SoulLayerType =
  | 'core_identity'
  | 'personality'
  | 'voice'
  | 'knowledge'
  | 'behavioral_rules'
  | 'context'
  | 'memory';

export interface SoulLayer {
  id: string;
  type: SoulLayerType;
  priority: number;
  content: string;
  source: string;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface CompositionResult {
  prompt: string;
  layers: SoulLayer[];
  tokenEstimate: number;
}

/** Layer type registry with default priority ordering */
export const LAYER_REGISTRY: Record<
  SoulLayerType,
  { label: string; priority: number; description: string }
> = {
  core_identity: {
    label: 'Core Identity',
    priority: 10,
    description: 'Immutable identity statement ("You are Luv...")',
  },
  personality: {
    label: 'Personality',
    priority: 20,
    description: 'Archetype, temperament, and personality traits',
  },
  voice: {
    label: 'Voice',
    priority: 30,
    description: 'Tone, formality, humor, warmth, and speech quirks',
  },
  knowledge: {
    label: 'Knowledge',
    priority: 40,
    description: 'Skills and domain expertise',
  },
  behavioral_rules: {
    label: 'Behavioral Rules',
    priority: 50,
    description: 'Ordered constraints governing behavior',
  },
  context: {
    label: 'Context',
    priority: 60,
    description: 'Scene-specific or conversation-specific modifiers',
  },
  memory: {
    label: 'Memory',
    priority: 70,
    description: 'Persistent facts from past conversations (additive only)',
  },
};
