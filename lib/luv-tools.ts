/**
 * Luv: Agentic Tool Definitions
 *
 * Tools that let Luv introspect and propose changes to her own soul and chassis.
 * Read tools execute immediately; write tools return proposals for human approval.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { getLuvCharacterServer } from './luv-server';
import { luvResearchTools } from './luv-research-tools';

// ============================================================================
// Read Tools (execute server-side, no approval needed)
// ============================================================================

export const readSoul = tool({
  description:
    'Read the current soul data (personality, voice, rules, skills, background) from the database.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const character = await getLuvCharacterServer();
    if (!character) return { error: 'No character found' };
    return { soul_data: character.soul_data };
  },
});

export const readChassis = tool({
  description:
    'Read the current chassis data (physical appearance parameters: face, body, coloring, etc.) from the database.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const character = await getLuvCharacterServer();
    if (!character) return { error: 'No character found' };
    return { chassis_data: character.chassis_data };
  },
});

export const listReferences = tool({
  description:
    'List all reference images with their type, description, and tags.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const { getLuvReferencesServer } = await import('./luv-server');
    const refs = await getLuvReferencesServer();
    return {
      references: refs.map((r) => ({
        id: r.id,
        type: r.type,
        description: r.description,
        tags: r.tags,
      })),
    };
  },
});

export const listPromptTemplates = tool({
  description:
    'List all prompt templates, optionally filtered by category (chassis, aesthetic, context, style).',
  inputSchema: zodSchema(
    z.object({
      category: z
        .enum(['chassis', 'aesthetic', 'context', 'style'])
        .optional()
        .describe('Optional category filter'),
    })
  ),
  execute: async ({ category }) => {
    const { getLuvTemplatesServer } = await import('./luv-server');
    let templates = await getLuvTemplatesServer();
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }
    return {
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        template: t.template,
      })),
    };
  },
});

// ============================================================================
// Chassis Module Read Tools
// ============================================================================

export const listChassisModules = tool({
  description:
    'List all chassis modules with their slug, name, category, and current version. Use this to discover available modules before reading or proposing changes.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const { getChassisModulesServer } = await import('./luv-chassis-server');
    const modules = await getChassisModulesServer();
    return {
      modules: modules.map((m) => ({
        id: m.id,
        slug: m.slug,
        name: m.name,
        category: m.category,
        description: m.description,
        current_version: m.current_version,
      })),
    };
  },
});

export const readChassisModule = tool({
  description:
    'Read a specific chassis module by slug (e.g. "eyes", "skin", "hair", "skeletal", "mouth", "nose", "body-proportions"). Returns all parameters for the module.',
  inputSchema: zodSchema(
    z.object({
      slug: z.string().describe('Module slug (e.g. "eyes", "hair", "skin")'),
    })
  ),
  execute: async ({ slug }) => {
    const { getChassisModuleBySlugServer } = await import(
      './luv-chassis-server'
    );
    const mod = await getChassisModuleBySlugServer(slug);
    if (!mod) return { error: `Module "${slug}" not found` };
    return {
      id: mod.id,
      slug: mod.slug,
      name: mod.name,
      category: mod.category,
      description: mod.description,
      current_version: mod.current_version,
      parameters: mod.parameters,
      parameter_schema: mod.parameter_schema,
    };
  },
});

// ============================================================================
// Write Tools (return proposals, don't execute mutations)
// ============================================================================

const changeProposalSchema = z.object({
  field: z.string().describe('Top-level field name'),
  path: z.string().optional().describe('Dot-notation sub-path within the field'),
  proposedValue: z.unknown().describe('The new value to set'),
  reason: z.string().describe('Why this change is being proposed'),
});

export const proposeSoulChange = tool({
  description:
    'Propose a change to a soul data field. Returns a proposal that requires human approval before being applied. Use dot notation for nested paths (e.g. field="personality", path="archetype").',
  inputSchema: zodSchema(changeProposalSchema),
  execute: async ({ field, path, proposedValue, reason }) => {
    const character = await getLuvCharacterServer();
    if (!character) return { error: 'No character found' };

    const soulData = character.soul_data;
    const fullPath = path ? `${field}.${path}` : field;

    // Resolve current value
    let currentValue: unknown = soulData[field];
    if (path && currentValue && typeof currentValue === 'object') {
      const parts = path.split('.');
      let cursor = currentValue as Record<string, unknown>;
      for (const part of parts) {
        cursor = cursor?.[part] as Record<string, unknown>;
      }
      currentValue = cursor;
    }

    return {
      type: 'soul_change_proposal' as const,
      characterId: character.id,
      field,
      path: fullPath,
      currentValue,
      proposedValue,
      reason,
    };
  },
});

export const proposeChassisChange = tool({
  description:
    'Propose a change to a chassis data field. Returns a proposal that requires human approval before being applied.',
  inputSchema: zodSchema(changeProposalSchema),
  execute: async ({ field, path, proposedValue, reason }) => {
    const character = await getLuvCharacterServer();
    if (!character) return { error: 'No character found' };

    const chassisData = character.chassis_data;
    const fullPath = path ? `${field}.${path}` : field;

    let currentValue: unknown = chassisData[field];
    if (path && currentValue && typeof currentValue === 'object') {
      const parts = path.split('.');
      let cursor = currentValue as Record<string, unknown>;
      for (const part of parts) {
        cursor = cursor?.[part] as Record<string, unknown>;
      }
      currentValue = cursor;
    }

    return {
      type: 'chassis_change_proposal' as const,
      characterId: character.id,
      field,
      path: fullPath,
      currentValue,
      proposedValue,
      reason,
    };
  },
});

export const proposeModuleChange = tool({
  description:
    'Propose a parameter change to a chassis module. Returns a proposal that requires human approval. Use read_chassis_module first to see current values.',
  inputSchema: zodSchema(
    z.object({
      moduleSlug: z
        .string()
        .describe('Module slug (e.g. "eyes", "hair", "skin")'),
      parameterKey: z
        .string()
        .describe('Parameter key to change (e.g. "color", "shape")'),
      proposedValue: z.unknown().describe('The new value to set'),
      reason: z.string().describe('Why this change is being proposed'),
    })
  ),
  execute: async ({ moduleSlug, parameterKey, proposedValue, reason }) => {
    const { getChassisModuleBySlugServer } = await import(
      './luv-chassis-server'
    );
    const mod = await getChassisModuleBySlugServer(moduleSlug);
    if (!mod) return { error: `Module "${moduleSlug}" not found` };

    const currentValue = mod.parameters[parameterKey];

    return {
      type: 'module_change_proposal' as const,
      moduleId: mod.id,
      moduleSlug: mod.slug,
      moduleName: mod.name,
      parameterKey,
      currentValue,
      proposedValue,
      reason,
    };
  },
});

export const proposeModuleChanges = tool({
  description:
    'Propose multiple parameter changes to a chassis module in one batch. More efficient than individual propose_module_change calls when updating several parameters at once. Returns a batch proposal that requires human approval.',
  inputSchema: zodSchema(
    z.object({
      moduleSlug: z
        .string()
        .describe('Module slug (e.g. "eyes", "hair", "skin")'),
      changes: z
        .array(
          z.object({
            parameterKey: z.string().describe('Parameter key to change'),
            proposedValue: z.unknown().describe('The new value to set'),
            reason: z.string().describe('Why this parameter should change'),
          })
        )
        .min(1)
        .describe('List of parameter changes'),
      overallReason: z
        .string()
        .describe('Overall reason for this batch of changes'),
    })
  ),
  execute: async ({ moduleSlug, changes, overallReason }) => {
    const { getChassisModuleBySlugServer } = await import(
      './luv-chassis-server'
    );
    const mod = await getChassisModuleBySlugServer(moduleSlug);
    if (!mod) return { error: `Module "${moduleSlug}" not found` };

    const enrichedChanges = changes.map((c) => ({
      parameterKey: c.parameterKey,
      currentValue: mod.parameters[c.parameterKey],
      proposedValue: c.proposedValue,
      reason: c.reason,
    }));

    return {
      type: 'batch_module_change_proposal' as const,
      moduleId: mod.id,
      moduleSlug: mod.slug,
      moduleName: mod.name,
      changes: enrichedChanges,
      overallReason,
    };
  },
});

// ============================================================================
// Context Pack Tools
// ============================================================================

export const composeContextPack = tool({
  description:
    'Compose a context pack for a chassis module: generates a prompt template from current parameters and suggested evaluation criteria. Does NOT save — returns a proposal.',
  inputSchema: zodSchema(
    z.object({
      moduleSlug: z
        .string()
        .describe('Module slug (e.g. "eyes", "hair", "skin")'),
    })
  ),
  execute: async ({ moduleSlug }) => {
    const { getChassisModuleBySlugServer } = await import('./luv-chassis-server');

    const mod = await getChassisModuleBySlugServer(moduleSlug);
    if (!mod) return { error: `Module "${moduleSlug}" not found` };

    const parameterSchema = mod.parameter_schema ?? [];
    if (parameterSchema.length === 0) return { error: `Module "${moduleSlug}" has no parameter schema` };

    const promptLines = [`${mod.name} specifications:`];
    const criteria = [];

    for (const p of parameterSchema) {
      const value = mod.parameters[p.key];
      promptLines.push(`- ${p.label}: {{modules.${mod.slug}.${p.key}}}`);
      if (value !== undefined && value !== null) {
        criteria.push({
          parameterKey: p.key,
          label: p.label,
          expectedValue: typeof value === 'object' ? JSON.stringify(value) : String(value),
        });
      }
    }

    return {
      type: 'context_pack_proposal' as const,
      moduleId: mod.id,
      moduleSlug: mod.slug,
      version: mod.current_version,
      generationPrompt: promptLines.join('\n'),
      evaluationCriteria: criteria,
    };
  },
});

export const evaluateGeneration = tool({
  description:
    'Evaluate a generated image against context pack criteria. Returns structured evaluation results with pass/fail per criterion.',
  inputSchema: zodSchema(
    z.object({
      contextPackId: z.string().describe('Context pack ID to evaluate against'),
      observations: z
        .array(
          z.object({
            parameterKey: z.string(),
            observed: z.string().describe('What was actually observed in the output'),
            passed: z.boolean().describe('Whether the criterion was met'),
            correction: z.string().optional().describe('Suggested fix if failed'),
          })
        )
        .describe('Per-criterion observations from reviewing the output'),
    })
  ),
  execute: async ({ contextPackId, observations }) => {
    const { getContextPack } = await import('./luv-chassis');

    let pack;
    try {
      pack = await getContextPack(contextPackId);
    } catch {
      return { error: 'Context pack not found' };
    }

    const results = pack.evaluation_criteria.map((criterion) => {
      const obs = observations.find((o) => o.parameterKey === criterion.parameterKey);
      return {
        ...criterion,
        passed: obs?.passed ?? undefined,
        observed: obs?.observed ?? null,
        correction: obs?.correction ?? null,
      };
    });

    const passCount = results.filter((r) => r.passed === true).length;
    const failCount = results.filter((r) => r.passed === false).length;

    return {
      type: 'evaluation_result' as const,
      contextPackId: pack.id,
      moduleId: pack.module_id,
      version: pack.version,
      results,
      summary: {
        total: results.length,
        passed: passCount,
        failed: failCount,
        unreviewed: results.length - passCount - failCount,
      },
      corrections: results
        .filter((r) => r.correction)
        .map((r) => ({
          criterion: r.label,
          observation: r.observed,
          correction: r.correction,
        })),
    };
  },
});

// ============================================================================
// Vision Tools (return multipart content via toModelOutput)
// ============================================================================

export const viewReferenceImage = tool({
  description:
    'View a reference image by its ID. Returns the image so you can see it and describe what you observe.',
  inputSchema: zodSchema(
    z.object({
      referenceId: z.string().describe('Reference image ID (UUID)'),
    })
  ),
  execute: async ({ referenceId }) => {
    const { getLuvReferencesServer } = await import('./luv-server');
    const refs = await getLuvReferencesServer();
    const ref = refs.find((r) => r.id === referenceId);
    if (!ref) return { error: `Reference "${referenceId}" not found` };
    return {
      id: ref.id,
      type: ref.type,
      description: ref.description,
      tags: ref.tags,
      storage_path: ref.storage_path,
    };
  },
  toModelOutput: async ({ output }) => {
    const result = output as { error?: string; storage_path?: string; description?: string; tags?: string[] };
    if (result.error) return { type: 'text', value: result.error };

    const { resolveImageAsBase64 } = await import('./luv-image-utils');
    try {
      const { base64, mediaType } = await resolveImageAsBase64(result.storage_path!);
      return {
        type: 'content',
        value: [
          { type: 'text' as const, text: `Reference image: ${result.description ?? 'no description'}. Tags: ${(result.tags ?? []).join(', ')}` },
          { type: 'file-data' as const, data: base64, mediaType },
        ],
      };
    } catch {
      return { type: 'text', value: `Image exists but could not be loaded from storage.` };
    }
  },
});

export const viewModuleMedia = tool({
  description:
    'View media attached to a chassis module. Optionally filter by parameter key. Returns the first matching image.',
  inputSchema: zodSchema(
    z.object({
      moduleSlug: z.string().describe('Module slug (e.g. "eyes", "hair")'),
      parameterKey: z.string().optional().describe('Optional parameter key to filter media'),
    })
  ),
  execute: async ({ moduleSlug, parameterKey }) => {
    const { getChassisModuleBySlugServer, getChassisModuleMediaServer } = await import('./luv-chassis-server');
    const mod = await getChassisModuleBySlugServer(moduleSlug);
    if (!mod) return { error: `Module "${moduleSlug}" not found` };

    let media = await getChassisModuleMediaServer(mod.id);
    if (parameterKey) {
      media = media.filter((m) => m.parameter_key === parameterKey);
    }
    if (media.length === 0) {
      return { error: `No media found for module "${moduleSlug}"${parameterKey ? ` parameter "${parameterKey}"` : ''}` };
    }

    const item = media[0];
    return {
      moduleSlug: mod.slug,
      moduleName: mod.name,
      parameterKey: item.parameter_key,
      description: item.description,
      storage_path: item.storage_path,
    };
  },
  toModelOutput: async ({ output }) => {
    const result = output as { error?: string; storage_path?: string; moduleName?: string; parameterKey?: string; description?: string };
    if (result.error) return { type: 'text', value: result.error };

    const { resolveImageAsBase64 } = await import('./luv-image-utils');
    try {
      const { base64, mediaType } = await resolveImageAsBase64(result.storage_path!);
      return {
        type: 'content',
        value: [
          { type: 'text' as const, text: `Module media: ${result.moduleName} / ${result.parameterKey}. ${result.description ?? ''}` },
          { type: 'file-data' as const, data: base64, mediaType },
        ],
      };
    } catch {
      return { type: 'text', value: `Media record exists but image could not be loaded from storage.` };
    }
  },
});

export const reviewChassisModule = tool({
  description:
    'Self-review tool: loads a chassis module\'s full parameters + schema AND an image (module media or canonical reference fallback) in one call. Use this to compare what you see in the image against the parametric configuration and propose corrections.',
  inputSchema: zodSchema(
    z.object({
      moduleSlug: z.string().describe('Module slug (e.g. "eyes", "hair", "skin")'),
      referenceId: z.string().optional().describe('Optional specific reference image ID. If omitted, tries module media then canonical reference.'),
    })
  ),
  execute: async ({ moduleSlug, referenceId }) => {
    const { getChassisModuleBySlugServer, getChassisModuleMediaServer } = await import('./luv-chassis-server');
    const mod = await getChassisModuleBySlugServer(moduleSlug);
    if (!mod) return { error: `Module "${moduleSlug}" not found` };

    // Try to find an image: specific reference > module media > canonical reference
    let storagePath: string | null = null;
    let imageSource = '';

    if (referenceId) {
      const { getLuvReferencesServer } = await import('./luv-server');
      const refs = await getLuvReferencesServer();
      const ref = refs.find((r) => r.id === referenceId);
      if (ref) {
        storagePath = ref.storage_path;
        imageSource = `reference: ${ref.description ?? ref.id}`;
      }
    }

    if (!storagePath) {
      const media = await getChassisModuleMediaServer(mod.id);
      if (media.length > 0) {
        storagePath = media[0].storage_path;
        imageSource = `module media: ${media[0].parameter_key}`;
      }
    }

    if (!storagePath) {
      const { getLuvReferencesServer } = await import('./luv-server');
      const refs = await getLuvReferencesServer();
      // Try tag-matched reference first (e.g. reference tagged "eyes" for eyes module)
      const tagMatch = refs.find((r) =>
        r.tags?.some((t) => t.toLowerCase() === moduleSlug.toLowerCase() || t.toLowerCase() === mod.category?.toLowerCase())
      );
      if (tagMatch) {
        storagePath = tagMatch.storage_path;
        imageSource = `tag-matched reference: ${tagMatch.description ?? tagMatch.id}`;
      } else {
        // Fall back to any canonical reference
        const canonical = refs.find((r) => r.type === 'canonical');
        if (canonical) {
          storagePath = canonical.storage_path;
          imageSource = `canonical reference: ${canonical.description ?? canonical.id}`;
        }
      }
    }

    return {
      moduleSlug: mod.slug,
      moduleName: mod.name,
      category: mod.category,
      description: mod.description,
      parameters: mod.parameters,
      parameter_schema: mod.parameter_schema,
      current_version: mod.current_version,
      storagePath,
      imageSource,
    };
  },
  toModelOutput: async ({ output }) => {
    const result = output as {
      error?: string;
      moduleName?: string;
      moduleSlug?: string;
      parameters?: Record<string, unknown>;
      parameter_schema?: unknown[];
      storagePath?: string | null;
      imageSource?: string;
    };
    if (result.error) return { type: 'text', value: result.error };

    const textSummary = [
      `Module: ${result.moduleName} (${result.moduleSlug})`,
      `Parameters: ${JSON.stringify(result.parameters, null, 2)}`,
      `Schema: ${JSON.stringify(result.parameter_schema, null, 2)}`,
      result.storagePath ? `Image source: ${result.imageSource}` : 'No image available for visual comparison.',
    ].join('\n\n');

    if (!result.storagePath) {
      return { type: 'text', value: textSummary };
    }

    const { resolveImageAsBase64 } = await import('./luv-image-utils');
    try {
      const { base64, mediaType } = await resolveImageAsBase64(result.storagePath);
      return {
        type: 'content',
        value: [
          { type: 'text' as const, text: textSummary },
          { type: 'file-data' as const, data: base64, mediaType },
        ],
      };
    } catch {
      return { type: 'text', value: textSummary + '\n\n(Image could not be loaded from storage.)' };
    }
  },
});

// ============================================================================
// Tool Registry
// ============================================================================

// ============================================================================
// Memory Tools
// ============================================================================

export const listMemories = tool({
  description:
    'List all active memories. Use this to check what you already know before saving a duplicate.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const { getLuvMemoriesServer } = await import('./luv-server');
    const memories = await getLuvMemoriesServer(true);
    return {
      memories: memories.map((m) => ({
        id: m.id,
        content: m.content,
        category: m.category,
        created_at: m.created_at,
      })),
    };
  },
});

export const saveMemory = tool({
  description:
    'Save a fact to persistent memory. Use this when the user tells you something worth remembering across conversations — preferences, facts about them, important context. Memories persist forever until deactivated.',
  inputSchema: zodSchema(
    z.object({
      content: z
        .string()
        .describe(
          'The fact to remember, written as a clear standalone statement (e.g. "Jon\'s favorite color is blue")'
        ),
      category: z
        .string()
        .optional()
        .describe(
          'Category for organization (e.g. "preference", "fact", "context", "relationship"). Defaults to "general"'
        ),
    })
  ),
  execute: async ({ content, category }) => {
    const { createLuvMemoryServer } = await import('./luv-server');
    const memory = await createLuvMemoryServer({
      content,
      category: category || 'general',
    });
    return {
      saved: true,
      id: memory.id,
      content: memory.content,
      category: memory.category,
    };
  },
});

// ============================================================================
// Facet Tools
// ============================================================================

export const proposeFacetChange = tool({
  description:
    'Propose adding, updating, or removing a soul facet — a dynamic psychological dimension (e.g. values, emotional patterns, relational dynamics). Returns a proposal that requires human approval.',
  inputSchema: zodSchema(
    z.object({
      action: z.enum(['add', 'update', 'remove']),
      key: z.string().describe('Unique identifier for the facet (e.g. "values", "emotional_patterns")'),
      label: z.string().optional().describe('Display name (required for add)'),
      type: z.enum(['text', 'tags', 'key_value']).optional().describe('Content type (required for add)'),
      layer: z.string().optional().describe('Which composition layer this feeds into (required for add)'),
      content: z.unknown().optional().describe('Facet content — string for text, string[] for tags, Record<string,string> for key_value (required for add/update)'),
      description: z.string().optional().describe('What this facet represents'),
      reason: z.string().describe('Why this change is being proposed'),
    })
  ),
  execute: async ({ action, key, label, type, layer, content, description, reason }) => {
    const character = await getLuvCharacterServer();
    if (!character) return { error: 'No character found' };

    const facets = character.soul_data.facets ?? [];
    const currentFacet = facets.find((f) => f.key === key);

    if (action === 'add' && currentFacet) {
      return { error: `Facet "${key}" already exists. Use action "update" instead.` };
    }
    if ((action === 'update' || action === 'remove') && !currentFacet) {
      return { error: `Facet "${key}" not found. Use action "add" to create it.` };
    }
    if (action === 'add' && (!label || !type || !layer)) {
      return { error: 'label, type, and layer are required when adding a facet.' };
    }

    const facet = action === 'add'
      ? { key, label: label!, type: type!, layer: layer!, content, description }
      : action === 'update'
        ? { ...currentFacet!, ...(label !== undefined && { label }), ...(type !== undefined && { type }), ...(layer !== undefined && { layer }), ...(content !== undefined && { content }), ...(description !== undefined && { description }) }
        : currentFacet!;

    return {
      type: 'facet_change_proposal' as const,
      characterId: character.id,
      action,
      facet,
      currentFacet: currentFacet ?? null,
      reason,
    };
  },
});

// ============================================================================
// Context Tool (factory — needs pageContext injected at request time)
// ============================================================================

import type { LuvPageContext } from './types/luv';

export function createCurrentContextTool(pageContext: LuvPageContext | null) {
  return tool({
    description:
      'Get the current context: what time it is, which page the user is viewing in the Luv workbench, and any data rendered on that page. Call this at the start of a conversation to orient yourself.',
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      if (!pageContext) {
        return { timestamp: new Date().toISOString(), note: 'No page context available' };
      }
      return {
        ...pageContext,
        // Refresh timestamp to actual call time
        timestamp: new Date().toISOString(),
      };
    },
  });
}

// ============================================================================
// Tool Registry
// ============================================================================

export const luvTools = {
  read_soul: readSoul,
  read_chassis: readChassis,
  list_references: listReferences,
  list_prompt_templates: listPromptTemplates,
  list_chassis_modules: listChassisModules,
  read_chassis_module: readChassisModule,
  propose_soul_change: proposeSoulChange,
  propose_chassis_change: proposeChassisChange,
  propose_module_change: proposeModuleChange,
  propose_module_changes: proposeModuleChanges,
  compose_context_pack: composeContextPack,
  evaluate_generation: evaluateGeneration,
  view_reference_image: viewReferenceImage,
  view_module_media: viewModuleMedia,
  review_chassis_module: reviewChassisModule,
  list_memories: listMemories,
  save_memory: saveMemory,
  propose_facet_change: proposeFacetChange,
  ...luvResearchTools,
};
