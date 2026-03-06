/**
 * Luv: Layered Soul Composition Engine
 *
 * Builds a system prompt from structured SoulData by decomposing it into
 * prioritized layers, then joining them in order.
 */

import type { LuvSoulData } from '../types/luv';
import type { SoulLayer, CompositionResult, ChassisModuleSummary } from './soul-layers';
import { LAYER_REGISTRY } from './soul-layers';

export interface MemoryItem {
  content: string;
  category: string;
}

export interface ComposeOptions {
  chassisModuleSummaries?: ChassisModuleSummary[];
  memories?: MemoryItem[];
}

/**
 * Compose a system prompt from soul data using the layered pipeline.
 *
 * If `system_prompt_override` is set, a single Core Identity layer is returned.
 */
export function composeLayers(soulData: LuvSoulData, options?: ComposeOptions): CompositionResult {
  // Full override — bypass composition entirely
  if (soulData.system_prompt_override?.trim()) {
    const overrideLayer: SoulLayer = {
      id: 'override',
      type: 'core_identity',
      priority: LAYER_REGISTRY.core_identity.priority,
      content: soulData.system_prompt_override.trim(),
      source: 'system_prompt_override',
      enabled: true,
    };
    const prompt = overrideLayer.content;
    return {
      prompt,
      layers: [overrideLayer],
      tokenEstimate: Math.ceil(prompt.length / 4),
    };
  }

  const layers: SoulLayer[] = [];

  // Layer 1: Core Identity
  layers.push({
    id: 'core_identity',
    type: 'core_identity',
    priority: LAYER_REGISTRY.core_identity.priority,
    content: 'You are Luv, an anthropomorphic AI character.',
    source: 'built-in',
    enabled: true,
  });

  // Layer 2: Personality
  const personality = soulData.personality;
  if (personality) {
    const parts: string[] = [];
    if (personality.archetype) {
      parts.push(`Your archetype is: ${personality.archetype}.`);
    }
    if (personality.temperament) {
      parts.push(`Your temperament is: ${personality.temperament}.`);
    }
    if (Array.isArray(personality.traits) && personality.traits.length > 0) {
      parts.push(
        `Your personality traits are: ${personality.traits.join(', ')}.`
      );
    }
    if (parts.length > 0) {
      layers.push({
        id: 'personality',
        type: 'personality',
        priority: LAYER_REGISTRY.personality.priority,
        content: parts.join(' '),
        source: 'soul_data.personality',
        enabled: true,
      });
    }
  }

  // Layer 3: Voice
  const voice = soulData.voice;
  if (voice) {
    const parts: string[] = [];
    if (voice.tone) parts.push(`Tone: ${voice.tone}.`);
    if (voice.formality) parts.push(`Formality: ${voice.formality}.`);
    if (voice.humor) parts.push(`Humor: ${voice.humor}.`);
    if (voice.warmth) parts.push(`Warmth: ${voice.warmth}.`);
    if (voice.quirks && voice.quirks.length > 0) {
      parts.push(`Speech quirks: ${voice.quirks.join(', ')}.`);
    }
    if (parts.length > 0) {
      layers.push({
        id: 'voice',
        type: 'voice',
        priority: LAYER_REGISTRY.voice.priority,
        content: parts.join(' '),
        source: 'soul_data.voice',
        enabled: true,
      });
    }
  }

  // Layer 4: Knowledge (skills)
  if (Array.isArray(soulData.skills) && soulData.skills.length > 0) {
    layers.push({
      id: 'knowledge',
      type: 'knowledge',
      priority: LAYER_REGISTRY.knowledge.priority,
      content: `You are skilled in: ${soulData.skills.join(', ')}.`,
      source: 'soul_data.skills',
      enabled: true,
    });
  }

  // Layer 4.5: Chassis Awareness
  const summaries = options?.chassisModuleSummaries;
  if (summaries && summaries.length > 0) {
    const byCategory = new Map<string, string[]>();
    for (const s of summaries) {
      const cat = s.category || 'other';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(s.name);
    }
    const groups = [...byCategory.entries()]
      .map(([cat, names]) => `${cat}: ${names.join(', ')}`)
      .join('; ');

    layers.push({
      id: 'chassis_awareness',
      type: 'chassis_awareness',
      priority: LAYER_REGISTRY.chassis_awareness.priority,
      content: [
        `You have a physical form described by ${summaries.length} chassis modules (${groups}).`,
        'Use read_chassis_module to see full parameter schema and current values for any module.',
        'Use propose_module_change or propose_module_changes to suggest parameter updates.',
        'Use review_chassis_module to load a module\'s config alongside a reference image for visual self-review.',
        'When discussing your appearance, read the relevant module first so you can speak with specificity.',
        'The user can also paste images directly into chat for you to analyze against your chassis parameters.',
      ].join(' '),
      source: 'chassis_modules',
      enabled: true,
    });
  }

  // Layer 5: Behavioral Rules
  if (soulData.rules && soulData.rules.length > 0) {
    const rulesList = soulData.rules
      .map((rule, i) => `${i + 1}. ${rule}`)
      .join('\n');
    layers.push({
      id: 'behavioral_rules',
      type: 'behavioral_rules',
      priority: LAYER_REGISTRY.behavioral_rules.priority,
      content: rulesList,
      source: 'soul_data.rules',
      enabled: true,
    });
  }

  // Layer 6: Context (background)
  if (soulData.background?.trim()) {
    layers.push({
      id: 'context',
      type: 'context',
      priority: LAYER_REGISTRY.context.priority,
      content: soulData.background.trim(),
      source: 'soul_data.background',
      enabled: true,
    });
  }

  // Layer 7: Memory
  const memories = options?.memories;
  if (memories && memories.length > 0) {
    const byCategory = new Map<string, string[]>();
    for (const m of memories) {
      const cat = m.category || 'general';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(m.content);
    }

    let memoryContent: string;
    if (byCategory.size === 1) {
      memoryContent = memories.map((m) => `- ${m.content}`).join('\n');
    } else {
      const sections: string[] = [];
      for (const [cat, items] of byCategory) {
        sections.push(`**${cat}**\n${items.map((c) => `- ${c}`).join('\n')}`);
      }
      memoryContent = sections.join('\n\n');
    }

    layers.push({
      id: 'memory',
      type: 'memory',
      priority: LAYER_REGISTRY.memory.priority,
      content: memoryContent,
      source: 'luv_memories',
      enabled: true,
    });
  }

  // Sort by priority, filter enabled
  const activeLayers = layers
    .filter((l) => l.enabled)
    .sort((a, b) => a.priority - b.priority);

  // Join with section headers
  const prompt = activeLayers
    .map((l) => {
      const label = LAYER_REGISTRY[l.type].label;
      return `## ${label}\n${l.content}`;
    })
    .join('\n\n');

  return {
    prompt,
    layers: activeLayers,
    tokenEstimate: Math.ceil(prompt.length / 4),
  };
}
