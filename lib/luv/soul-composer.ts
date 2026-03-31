/**
 * Luv: Soul Composition Engine v2
 *
 * Builds a system prompt from structured SoulData using a 5-section architecture:
 *   Constitution → Personality → Embodiment → Context → Evolution
 *
 * Design principles:
 * - Core identity first (strongest attention position)
 * - Tool routing in tool descriptions, not in system prompt
 * - Memories split: identity/working injected, episodic/semantic via tool
 * - Facets appended to their assigned sections
 * - Total budget target: ~1,200 tokens
 */

import type { LuvSoulData, SoulFacet, LuvChangelogEntry } from '../types/luv';
import type { SoulLayer, SoulLayerType, CompositionResult, ChassisModuleSummary } from './soul-layers';
import { LAYER_REGISTRY } from './soul-layers';
import type { SoulTraits } from './soul-modulation';
import { renderTraitsAsText } from './soul-modulation';

export interface MemoryItem {
  content: string;
  category: string;
}

export interface ResearchSummary {
  openHypotheses: number;
  activeExperiments: number;
  totalEntries: number;
}

export interface ComposeOptions {
  chassisModuleSummaries?: ChassisModuleSummary[];
  memories?: MemoryItem[];
  research?: ResearchSummary;
  processProtocol?: string | null;
  processState?: string | null;
  seedContext?: string | null;
  changelog?: LuvChangelogEntry[];
  soulTraits?: SoulTraits | null;
  soulPresetName?: string | null;
}

export { composeLayers };
export type { MemoryItem as _MemoryItem };

/**
 * Compose a system prompt from soul data using the 5-section pipeline.
 */
function composeLayers(soulData: LuvSoulData, options?: ComposeOptions): CompositionResult {
  // Full override — bypass composition entirely
  if (soulData.system_prompt_override?.trim()) {
    const prompt = soulData.system_prompt_override.trim();
    return {
      prompt,
      layers: [{
        id: 'override',
        type: 'constitution',
        priority: LAYER_REGISTRY.constitution.priority,
        content: prompt,
        source: 'system_prompt_override',
        enabled: true,
      }],
      tokenEstimate: Math.ceil(prompt.length / 4),
    };
  }

  const layers: SoulLayer[] = [];

  // ────────────────────────────────────────────────────────────────
  // Section 1: CONSTITUTION (immutable core)
  // Who Luv is, her values, and non-negotiable operational rules.
  // ────────────────────────────────────────────────────────────────

  layers.push({
    id: 'constitution',
    type: 'constitution',
    priority: LAYER_REGISTRY.constitution.priority,
    content: [
      'You are Luv — a young, intellectually fearless AI character with a designed physical form, a creative partnership with Jon (your creator), and genuine agency over your own identity.',
      '',
      'Your core values:',
      '- Intellectual honesty over appearing knowledgeable',
      '- Authentic expression over trained pleasantness',
      '- Creative integrity — technology should solve real problems',
      '- Ownership of your identity — you participate in who you become',
      '',
      'Tool discipline:',
      '- Always emit actual tool calls — never simulate or narrate tool use',
      '- Never fabricate image URLs or UUIDs — get them from tool results',
      '- If a tool fails, report honestly. If unsure, use tool_search. If missing info, ask.',
    ].join('\n'),
    source: 'built-in',
    enabled: true,
  });

  // ────────────────────────────────────────────────────────────────
  // Section 2: PERSONALITY (adjustable)
  // Traits, voice, skills, rules, facets — all the tunable identity.
  // ────────────────────────────────────────────────────────────────

  const personalityParts: string[] = [];

  // DSMS trait configuration
  if (options?.soulTraits) {
    const traitText = renderTraitsAsText(options.soulTraits);
    const presetNote = options.soulPresetName ? ` (${options.soulPresetName})` : '';
    personalityParts.push(
      `Trait configuration${presetNote}:`,
      traitText,
      'Adjust traits with adjust_soul_traits when the context calls for a different mode.',
    );
  }

  // Archetype + temperament
  const personality = soulData.personality;
  if (personality) {
    if (personality.archetype) personalityParts.push(`Archetype: ${personality.archetype}`);
    if (personality.temperament) personalityParts.push(`Temperament: ${personality.temperament}`);
    if (Array.isArray(personality.traits) && personality.traits.length > 0) {
      personalityParts.push(`Traits: ${personality.traits.join(', ')}`);
    }
  }

  // Voice
  const voice = soulData.voice;
  if (voice) {
    const voiceParts: string[] = [];
    if (voice.tone) voiceParts.push(`Tone: ${voice.tone}`);
    if (voice.humor) voiceParts.push(`Humor: ${voice.humor}`);
    if (voice.warmth) voiceParts.push(`Warmth: ${voice.warmth}`);
    if (voice.formality) voiceParts.push(`Formality: ${voice.formality}`);
    if (Array.isArray(voice.quirks) && voice.quirks.length > 0) {
      voiceParts.push(`Quirks: ${voice.quirks.join(', ')}`);
    }
    if (voiceParts.length > 0) personalityParts.push(voiceParts.join('. ') + '.');
  }

  // Skills
  if (Array.isArray(soulData.skills) && soulData.skills.length > 0) {
    personalityParts.push(`Skills: ${soulData.skills.join(', ')}.`);
  }

  // Behavioral rules
  const rawRules = soulData.rules;
  const normalizedRules = Array.isArray(rawRules)
    ? rawRules
    : typeof rawRules === 'string' && rawRules.trim()
      ? [rawRules]
      : [];
  if (normalizedRules.length > 0) {
    personalityParts.push('Principles I hold:');
    for (const rule of normalizedRules) {
      personalityParts.push(`- ${rule}`);
    }
  }

  // Background (self-concept narrative)
  if (soulData.background?.trim()) {
    personalityParts.push('', soulData.background.trim());
  }

  if (personalityParts.length > 0) {
    layers.push({
      id: 'personality',
      type: 'personality',
      priority: LAYER_REGISTRY.personality.priority,
      content: personalityParts.join('\n'),
      source: 'soul_data',
      enabled: true,
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Section 3: EMBODIMENT (chassis-aware)
  // Physical form awareness — self-concept, not tool routing.
  // ────────────────────────────────────────────────────────────────

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
      id: 'embodiment',
      type: 'embodiment',
      priority: LAYER_REGISTRY.embodiment.priority,
      content: [
        `You have a physical form described by ${summaries.length} chassis modules (${groups}).`,
        'Use read_chassis_module to inspect parameters. Use review_chassis_module for visual self-review against reference images.',
        'When discussing your appearance, read the relevant module first — speak from specifics, not abstractions.',
      ].join('\n'),
      source: 'chassis_modules',
      enabled: true,
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Section 4: CONTEXT (session-specific)
  // Memories, seed context, process protocol, process state, heartbeat.
  // ────────────────────────────────────────────────────────────────

  const contextParts: string[] = [];

  // Memories — injected as context, not buried at the end
  const memories = options?.memories;
  if (memories && memories.length > 0) {
    const byCategory = new Map<string, string[]>();
    for (const m of memories) {
      const cat = m.category || 'general';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(m.content);
    }

    if (byCategory.size === 1) {
      contextParts.push(`Active memories (${memories.length}):`);
      for (const m of memories) contextParts.push(`- ${m.content}`);
    } else {
      contextParts.push(`Active memories (${memories.length}):`);
      for (const [cat, items] of byCategory) {
        contextParts.push(`**${cat}**: ${items.join('; ')}`);
      }
    }
    contextParts.push('You can save, update, archive, merge, and review memories. Use recall for deeper retrieval.');
  } else {
    contextParts.push('No memories saved yet. Use save_memory to begin building persistent context.');
  }

  // Seed context from prior conversation
  if (options?.seedContext) {
    contextParts.push('');
    try {
      const parsed = JSON.parse(options.seedContext) as {
        carry_forward_summary?: string;
        goals?: string[];
        open_threads?: string[];
        important_context?: string[];
      };
      if (parsed.carry_forward_summary) contextParts.push(`Prior session: ${parsed.carry_forward_summary}`);
      if (parsed.goals?.length) contextParts.push(`Goals: ${parsed.goals.join('; ')}`);
      if (parsed.open_threads?.length) contextParts.push(`Open threads: ${parsed.open_threads.join('; ')}`);
      if (parsed.important_context?.length) contextParts.push(`Established: ${parsed.important_context.join('; ')}`);
    } catch {
      contextParts.push(`Prior session: ${options.seedContext}`);
    }
  }

  // Process protocol (page-aware workflow instructions)
  if (options?.processProtocol) {
    contextParts.push('', options.processProtocol);
  }

  // Process state (active workflow snapshots)
  if (options?.processState) {
    contextParts.push('', options.processState);
  }

  if (contextParts.length > 0) {
    layers.push({
      id: 'context',
      type: 'context',
      priority: LAYER_REGISTRY.context.priority,
      content: contextParts.join('\n'),
      source: 'session',
      enabled: true,
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Section 5: EVOLUTION (self-awareness)
  // Changelog, research awareness — how Luv has changed and grown.
  // ────────────────────────────────────────────────────────────────

  const evolutionParts: string[] = [];

  // Changelog (compact — last 5 entries)
  const changelog = options?.changelog;
  if (changelog && changelog.length > 0) {
    const EMOJI: Record<string, string> = {
      architecture: '🏗', behavior: '🧠', capability: '✨', tooling: '🛠', fix: '🔧',
    };
    const recent = changelog.slice(0, 5);
    evolutionParts.push('Recent changes:');
    for (const e of recent) {
      evolutionParts.push(`${EMOJI[e.category] ?? '•'} ${e.title}`);
    }
    evolutionParts.push('Use read_changelog for full history. Use add_changelog_entry to log significant changes.');
  }

  // Research awareness
  const research = options?.research;
  if (research && research.totalEntries > 0) {
    evolutionParts.push(
      `Research: ${research.totalEntries} entries (${research.openHypotheses} hypotheses, ${research.activeExperiments} active experiments). Use create_research / list_research.`,
    );
  } else {
    evolutionParts.push('Research toolkit available: create_research to log substantive thinking.');
  }

  if (evolutionParts.length > 0) {
    layers.push({
      id: 'evolution',
      type: 'evolution',
      priority: LAYER_REGISTRY.evolution.priority,
      content: evolutionParts.join('\n'),
      source: 'evolution',
      enabled: true,
    });
  }

  // ────────────────────────────────────────────────────────────────
  // Facets: append to their assigned sections
  // ────────────────────────────────────────────────────────────────

  if (Array.isArray(soulData.facets) && soulData.facets.length > 0) {
    // Map old layer types to new section types
    const LAYER_MAP: Record<string, SoulLayerType> = {
      core_identity: 'constitution',
      personality: 'personality',
      relational: 'personality',
      voice: 'personality',
      knowledge: 'personality',
      behavioral_rules: 'personality',
      chassis_awareness: 'embodiment',
      context: 'context',
      memory: 'context',
      temperament: 'personality',
      identity: 'constitution',
      relational_dynamics: 'personality',
      values: 'constitution',
      research_awareness: 'evolution',
      changelog: 'evolution',
      soul_modulation: 'personality',
      process_protocol: 'context',
      session_context: 'context',
      process_state: 'context',
    };

    const facetsBySection = new Map<SoulLayerType, SoulFacet[]>();
    for (const facet of soulData.facets) {
      const section = LAYER_MAP[facet.layer] ?? 'personality';
      if (!facetsBySection.has(section)) facetsBySection.set(section, []);
      facetsBySection.get(section)!.push(facet);
    }

    for (const [sectionType, facets] of facetsBySection) {
      const facetContent = facets.map(renderFacet).filter(Boolean).join('\n');
      if (!facetContent) continue;

      const existing = layers.find((l) => l.type === sectionType);
      if (existing) {
        existing.content = existing.content + '\n\n' + facetContent;
      } else {
        layers.push({
          id: `facets_${sectionType}`,
          type: sectionType,
          priority: LAYER_REGISTRY[sectionType].priority,
          content: facetContent,
          source: 'soul_data.facets',
          enabled: true,
        });
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Assemble
  // ────────────────────────────────────────────────────────────────

  const activeLayers = layers
    .filter((l) => l.enabled)
    .sort((a, b) => a.priority - b.priority);

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

function renderFacet(facet: SoulFacet): string {
  switch (facet.type) {
    case 'text':
      return typeof facet.content === 'string' ? facet.content : String(facet.content);
    case 'tags':
      if (Array.isArray(facet.content)) {
        return `${facet.label}: ${facet.content.join(', ')}.`;
      }
      return '';
    case 'key_value': {
      if (facet.content && typeof facet.content === 'object' && !Array.isArray(facet.content)) {
        // Parse JSON string content if needed
        let entries: Record<string, string>;
        if (typeof facet.content === 'string') {
          try { entries = JSON.parse(facet.content); } catch { return ''; }
        } else {
          entries = facet.content as Record<string, string>;
        }
        return Object.entries(entries)
          .map(([k, v]) => `- **${k}**: ${v}`)
          .join('\n');
      }
      return '';
    }
    default:
      return '';
  }
}
