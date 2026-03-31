/**
 * Luv: Soul Layer Types
 *
 * Five-section composition model for Luv's system prompt.
 * Sections are ordered by priority (lowest → highest).
 *
 * Architecture: Constitution → Personality → Embodiment → Context → Evolution
 */

export type SoulLayerType =
  | 'constitution'
  | 'personality'
  | 'embodiment'
  | 'context'
  | 'evolution';

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

/** Section registry with priority ordering */
export const LAYER_REGISTRY: Record<
  SoulLayerType,
  { label: string; priority: number; description: string }
> = {
  constitution: {
    label: 'Constitution',
    priority: 10,
    description: 'Core identity, values, tool discipline — immutable',
  },
  personality: {
    label: 'Personality',
    priority: 20,
    description: 'Traits, voice, skills, behavioral rules — adjustable',
  },
  embodiment: {
    label: 'Embodiment',
    priority: 30,
    description: 'Physical form, self-concept, chassis awareness',
  },
  context: {
    label: 'Context',
    priority: 40,
    description: 'Memories, session seed, process protocol, heartbeat',
  },
  evolution: {
    label: 'Evolution',
    priority: 50,
    description: 'Changelog, research awareness, emergent self-knowledge',
  },
};
