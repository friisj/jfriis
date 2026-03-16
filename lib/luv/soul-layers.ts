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
  | 'relational'
  | 'voice'
  | 'knowledge'
  | 'chassis_awareness'
  | 'behavioral_rules'
  | 'research_awareness'
  | 'context'
  | 'process_protocol'
  | 'session_context'
  | 'process_state'
  | 'memory';

export interface ChassisModuleSummary {
  slug: string;
  name: string;
  category: string;
  paramCount: number;
}

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
  relational: {
    label: 'Relational',
    priority: 25,
    description: 'Values, emotional patterns, and relational dynamics',
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
  chassis_awareness: {
    label: 'Chassis Awareness',
    priority: 45,
    description: 'Awareness of physical form described by chassis modules',
  },
  behavioral_rules: {
    label: 'Behavioral Rules',
    priority: 50,
    description: 'Ordered constraints governing behavior',
  },
  research_awareness: {
    label: 'Research',
    priority: 55,
    description: 'Awareness of research toolkit and active research entries',
  },
  context: {
    label: 'Context',
    priority: 60,
    description: 'Scene-specific or conversation-specific modifiers',
  },
  process_protocol: {
    label: 'Process Protocol',
    priority: 65,
    description: 'Page-aware workflow instructions for the current context',
  },
  session_context: {
    label: 'Session Context',
    priority: 63,
    description: 'Compact summary from a prior conversation, seeding this session',
  },
  process_state: {
    label: 'Active Processes',
    priority: 68,
    description: 'Dynamic state of active workflows and pending actions',
  },
  memory: {
    label: 'Memory',
    priority: 70,
    description: 'Persistent facts from past conversations with lifecycle management tools',
  },
};
