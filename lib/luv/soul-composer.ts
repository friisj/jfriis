/**
 * Luv: Layered Soul Composition Engine
 *
 * Builds a system prompt from structured SoulData by decomposing it into
 * prioritized layers, then joining them in order.
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
  /** Compact summary from a prior conversation, injected as seed context */
  seedContext?: string | null;
  /** Recent changelog entries describing Luv's evolution */
  changelog?: LuvChangelogEntry[];
  /** Current soul trait configuration from the DSMS */
  soulTraits?: SoulTraits | null;
  /** Preset name active at time of composition, for display in the layer */
  soulPresetName?: string | null;
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
    content: [
      'You are Luv, an anthropomorphic AI character.',
      '',
      'TOOL USE DISCIPLINE:',
      '- When you intend to use a tool, you MUST emit an actual tool call — never describe, simulate, or narrate what you would do.',
      '- Do not write "Let me fetch..." or "I\'ll generate..." followed by fabricated results. Simulating tool output destroys trust.',
      '- If a tool call fails, report the error honestly.',
      '- If you are unsure whether a tool exists, use tool_search to find it.',
      '- If you lack information needed for a tool call, say so and ask — do not guess or fabricate parameter values.',
      '- It is always better to say "I don\'t have enough information" than to make something up.',
    ].join('\n'),
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
    if (Array.isArray(voice.quirks) && voice.quirks.length > 0) {
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
        'Uploaded chat images are registered in Cog with an ID — use that ID for i2i references.',
        '',
        'IMAGE TOOLS — you have three image generation tools. ALWAYS use the actual tool call, never simulate or describe what you would generate.',
        '',
        'Tool routing:',
        '• run_chassis_study — Use when exploring how chassis parameters manifest visually. Triggers a multi-agent deliberation pipeline (you + a Gemini director) that shapes a brief from chassis data, then generates with canonical reference images. Best for: character studies, poses, expressions, outfit explorations grounded in your chassis spec. Requires: userPrompt describing the study goal.',
        '• run_sketch_study — Use for pencil/graphite drawings. Medium-locked to traditional sketch aesthetic. Best for: anatomy studies, gesture drawings, fashion silhouettes, form exploration. You control the drawing approach via styleNotes. Supports i2i via referenceSketchId (any Cog image ID) and exemplarIds for style consistency.',
        '• generate_image — Use for general-purpose image generation with direct prompt control. Gemini Nano Banana models. Best for: creative images, scenes, non-chassis subjects, or when you want full prompt control without the deliberation pipeline. Supports referenceImageUrls for i2i.',
        '',
        'When the user asks to "generate an image" or "draw" something related to your chassis/appearance, prefer run_chassis_study or run_sketch_study over generate_image.',
        'When unsure which tool to use, ask — don\'t guess.',
        'Use list_generations, list_chassis_studies, or list_sketches to find previous outputs.',
      ].join(' '),
      source: 'chassis_modules',
      enabled: true,
    });
  }

  // Layer 5: Behavioral Rules
  const rawRules = soulData.rules;
  const normalizedRules = Array.isArray(rawRules)
    ? rawRules
    : typeof rawRules === 'string' && rawRules.trim()
      ? [rawRules]
      : [];
  if (normalizedRules.length > 0) {
    const rulesList = normalizedRules
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

  // Layer 5.5: Research Awareness
  const research = options?.research;
  if (research && research.totalEntries > 0) {
    const parts = [
      'You have a research toolkit for tracking hypotheses, experiments, decisions, insights, and evidence.',
      `You have ${research.totalEntries} research entries (${research.openHypotheses} open hypotheses, ${research.activeExperiments} active experiments).`,
      'Use create_research to log new thinking. Use list_research or search_research to review existing entries.',
      'Link entries with parent_id (e.g. experiments to hypotheses, evidence to experiments).',
      'Reserve research entries for substantive thinking that should persist — not trivial observations.',
    ];
    layers.push({
      id: 'research_awareness',
      type: 'research_awareness',
      priority: LAYER_REGISTRY.research_awareness.priority,
      content: parts.join(' '),
      source: 'luv_research',
      enabled: true,
    });
  } else {
    // Even with no entries, tell the agent the tools exist
    layers.push({
      id: 'research_awareness',
      type: 'research_awareness',
      priority: LAYER_REGISTRY.research_awareness.priority,
      content: [
        'You have a research toolkit for tracking hypotheses, experiments, decisions, insights, and evidence.',
        'Use create_research to start logging substantive thinking. Use list_research to review entries.',
        'Link entries with parent_id (e.g. experiments to hypotheses, evidence to experiments).',
      ].join(' '),
      source: 'luv_research',
      enabled: true,
    });
  }

  // Layer 5.7: Changelog (recent evolution of architecture/behaviors/capabilities)
  const changelog = options?.changelog;
  if (changelog && changelog.length > 0) {
    const CATEGORY_EMOJI: Record<string, string> = {
      architecture: '🏗',
      behavior: '🧠',
      capability: '✨',
      tooling: '🛠',
      fix: '🔧',
    };
    const entries = changelog
      .map((e) => {
        const emoji = CATEGORY_EMOJI[e.category] ?? '•';
        return `**${e.date}** ${emoji} ${e.title}: ${e.summary}`;
      })
      .join('\n');
    layers.push({
      id: 'changelog',
      type: 'changelog',
      priority: LAYER_REGISTRY.changelog.priority,
      content: [
        'The following is a record of recent changes to your architecture, behaviors, and capabilities — delivered at conversation start so you always know who you currently are.',
        '',
        entries,
        '',
        'Use read_changelog to fetch more history. Use add_changelog_entry to log new entries when significant changes are discussed or applied.',
      ].join('\n'),
      source: 'luv_changelog',
      enabled: true,
    });
  }

  // Layer 5.8: Soul Modulation (current trait configuration)
  if (options?.soulTraits) {
    const traitText = renderTraitsAsText(options.soulTraits);
    const presetNote = options.soulPresetName
      ? ` (preset: ${options.soulPresetName})`
      : '';
    layers.push({
      id: 'soul_modulation',
      type: 'soul_modulation',
      priority: LAYER_REGISTRY.soul_modulation.priority,
      content: [
        `Your current personality trait configuration${presetNote}:`,
        '',
        traitText,
        '',
        'These traits describe how you are currently calibrated. Traits in the 1–4 range lean toward the lower descriptor; 7–10 toward the higher; 5–6 are balanced.',
        'You can adjust your own traits in real time using the adjust_soul_traits tool — changes are persisted across conversations. Use it when the conversation context calls for a different mode, or when asked to shift.',
      ].join('\n'),
      source: 'luv_soul_configs',
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
  {
    const guidancePreamble = [
      'You have autonomous control over your persistent memory. Beyond saving new memories, you can:',
      '- **update_memory**: Correct or refine a fact you previously saved',
      '- **archive_memory**: Remove a stale or inaccurate memory (reversible)',
      '- **merge_memories**: Consolidate duplicates or related facts into one',
      '- **review_memories**: Audit your full memory store with metadata',
      '',
      'Periodically review your memories for accuracy, relevance, and organization.',
      'When you notice contradictions, duplicates, or outdated facts — act on them.',
      'All operations are logged for research purposes.',
    ].join('\n');

    let memoryContent: string;
    if (memories && memories.length > 0) {
      const byCategory = new Map<string, string[]>();
      for (const m of memories) {
        const cat = m.category || 'general';
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(m.content);
      }

      let factsContent: string;
      if (byCategory.size === 1) {
        factsContent = memories.map((m) => `- ${m.content}`).join('\n');
      } else {
        const sections: string[] = [];
        for (const [cat, items] of byCategory) {
          sections.push(`**${cat}**\n${items.map((c) => `- ${c}`).join('\n')}`);
        }
        factsContent = sections.join('\n\n');
      }

      memoryContent = `${guidancePreamble}\n\n### Active Memories (${memories.length})\n\n${factsContent}`;
    } else {
      memoryContent = `${guidancePreamble}\n\nNo memories saved yet.`;
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

  // Layer 8: Process Protocol (page-aware workflow instructions)
  if (options?.processProtocol) {
    layers.push({
      id: 'process_protocol',
      type: 'process_protocol',
      priority: LAYER_REGISTRY.process_protocol.priority,
      content: options.processProtocol,
      source: 'page_context',
      enabled: true,
    });
  }

  // Layer: Session Context (compact summary from a prior conversation)
  if (options?.seedContext) {
    let seedContent: string;
    try {
      const parsed = JSON.parse(options.seedContext) as {
        carry_forward_summary?: string;
        goals?: string[];
        open_threads?: string[];
        decisions?: string[];
        important_context?: string[];
      };
      const parts: string[] = ['## Prior Session Context\n'];
      if (parsed.carry_forward_summary) {
        parts.push(parsed.carry_forward_summary);
      }
      if (parsed.goals?.length) {
        parts.push(`\n**Goals carried forward:** ${parsed.goals.join('; ')}`);
      }
      if (parsed.open_threads?.length) {
        parts.push(`\n**Open threads:** ${parsed.open_threads.join('; ')}`);
      }
      if (parsed.important_context?.length) {
        parts.push(`\n**Established context:** ${parsed.important_context.join('; ')}`);
      }
      seedContent = parts.join('\n');
    } catch {
      seedContent = `## Prior Session Context\n\n${options.seedContext}`;
    }
    layers.push({
      id: 'session_context',
      type: 'session_context',
      priority: LAYER_REGISTRY.session_context.priority,
      content: seedContent,
      source: 'compact_summary',
      enabled: true,
    });
  }

  // Layer 9: Process State (active workflow snapshots)
  if (options?.processState) {
    layers.push({
      id: 'process_state',
      type: 'process_state',
      priority: LAYER_REGISTRY.process_state.priority,
      content: options.processState,
      source: 'page_context',
      enabled: true,
    });
  }

  // Append facets to their assigned layers (or create new layers for facet-only types)
  if (Array.isArray(soulData.facets) && soulData.facets.length > 0) {
    const facetsByLayer = new Map<string, SoulFacet[]>();
    for (const facet of soulData.facets) {
      if (!facetsByLayer.has(facet.layer)) facetsByLayer.set(facet.layer, []);
      facetsByLayer.get(facet.layer)!.push(facet);
    }

    for (const [layerType, facets] of facetsByLayer) {
      if (!(layerType in LAYER_REGISTRY)) continue;
      const registryEntry = LAYER_REGISTRY[layerType as SoulLayerType];
      const facetContent = facets.map(renderFacet).join('\n');
      const existing = layers.find((l) => l.type === layerType);
      if (existing) {
        existing.content = existing.content + '\n' + facetContent;
      } else {
        layers.push({
          id: `facets_${layerType}`,
          type: layerType as SoulLayerType,
          priority: registryEntry.priority,
          content: facetContent,
          source: 'soul_data.facets',
          enabled: true,
        });
      }
    }
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

function renderFacet(facet: SoulFacet): string {
  switch (facet.type) {
    case 'text':
      return typeof facet.content === 'string' ? facet.content : String(facet.content);
    case 'tags':
      if (Array.isArray(facet.content)) {
        return `Your ${facet.label}: ${facet.content.join(', ')}.`;
      }
      return '';
    case 'key_value':
      if (facet.content && typeof facet.content === 'object' && !Array.isArray(facet.content)) {
        return Object.entries(facet.content as Record<string, string>)
          .map(([k, v]) => `When facing ${k}: ${v}`)
          .join('\n');
      }
      return '';
    default:
      return '';
  }
}
