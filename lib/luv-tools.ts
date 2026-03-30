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
import { luvArtifactTools } from './luv-artifact-tools';
import { luvReviewTools } from './luv-review-tools';
import { luvPlaygroundTools } from './luv-playground-tools';
import { luvChangelogTools } from './luv-changelog-tools';
import { acknowledgeNudge } from './luv-heartbeat';
import { updateVoiceConfig, getVoiceConfig } from './luv-voice-config';
import { listGenerations } from './luv-image-gen-tools';
import { validateTraitPatch, applyTraitPatch, DEFAULT_TRAITS, SOUL_TRAITS } from './luv/soul-modulation';
import { getCurrentSoulConfigServer, insertSoulConfigServer } from './luv-soul-modulation-server';

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
    'Propose a parameter change to a chassis module, or add a new parameter. Returns a proposal that requires human approval. Use read_chassis_module first to see current values. New parameters are auto-added to the schema when applied.',
  inputSchema: zodSchema(
    z.object({
      moduleSlug: z
        .string()
        .describe('Module slug (e.g. "eyes", "hair", "skin")'),
      parameterKey: z
        .string()
        .describe('Parameter key to change or add (e.g. "color", "pupil_dilation_response")'),
      proposedValue: z.unknown().describe('The new value to set'),
      reason: z.string().describe('Why this change is being proposed'),
      schemaHints: z.object({
        label: z.string().optional().describe('Human-readable label (e.g. "Pupil Dilation Response")'),
        type: z.enum(['text', 'number', 'range', 'color', 'enum', 'boolean', 'json', 'media_ref', 'measurement', 'ratio', 'constraint_range']).optional().describe('Parameter control type'),
        tier: z.enum(['basic', 'intermediate', 'advanced', 'clinical']).optional().describe('UI grouping tier'),
        description: z.string().optional().describe('What this parameter controls'),
        options: z.array(z.string()).optional().describe('Enum options if type is "enum"'),
      }).optional().describe('Schema metadata for new parameters. Provide when adding a parameter that does not yet exist.'),
    })
  ),
  execute: async ({ moduleSlug, parameterKey, proposedValue, reason, schemaHints }) => {
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
      ...(schemaHints && { schemaHints }),
    };
  },
});

export const proposeModuleChanges = tool({
  description:
    'Propose multiple parameter changes (or additions) to a chassis module in one batch. More efficient than individual propose_module_change calls when updating several parameters at once. New parameters are auto-added to the schema when applied. Returns a batch proposal that requires human approval.',
  inputSchema: zodSchema(
    z.object({
      moduleSlug: z
        .string()
        .describe('Module slug (e.g. "eyes", "hair", "skin")'),
      changes: z
        .array(
          z.object({
            parameterKey: z.string().describe('Parameter key to change or add'),
            proposedValue: z.unknown().describe('The new value to set'),
            reason: z.string().describe('Why this parameter should change'),
            schemaHints: z.object({
              label: z.string().optional(),
              type: z.enum(['text', 'number', 'range', 'color', 'enum', 'boolean', 'json', 'media_ref', 'measurement', 'ratio', 'constraint_range']).optional(),
              tier: z.enum(['basic', 'intermediate', 'advanced', 'clinical']).optional(),
              description: z.string().optional(),
              options: z.array(z.string()).optional(),
            }).optional().describe('Schema metadata for new parameters'),
          })
        )
        .min(1)
        .describe('List of parameter changes or additions'),
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
      ...(c.schemaHints && { schemaHints: c.schemaHints }),
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

export const proposeNewModule = tool({
  description:
    'Propose creating an entirely new chassis module. Use this when the existing modules don\'t cover an aspect of physical appearance or physiological response that should be tracked. Returns a proposal that requires human approval.',
  inputSchema: zodSchema(
    z.object({
      slug: z.string().describe('URL-friendly identifier (kebab-case, e.g. "physiological-responses")'),
      name: z.string().describe('Display name (e.g. "Physiological Responses")'),
      category: z.string().describe('Module category (e.g. "face", "body", "coloring", "expression", "physiology")'),
      description: z.string().describe('What this module tracks'),
      parameters: z.record(z.string(), z.unknown()).describe('Initial parameter values as key-value pairs'),
      parameterSchema: z.array(z.object({
        key: z.string(),
        label: z.string(),
        type: z.enum(['text', 'number', 'range', 'color', 'enum', 'boolean', 'json', 'media_ref', 'measurement', 'ratio', 'constraint_range']),
        tier: z.enum(['basic', 'intermediate', 'advanced', 'clinical']).optional(),
        description: z.string().optional(),
        options: z.array(z.string()).optional(),
      })).describe('Schema definitions for each parameter'),
      reason: z.string().describe('Why this module should be created'),
    })
  ),
  execute: async ({ slug, name, category, description, parameters, parameterSchema, reason }) => {
    // Check if slug already exists
    const { getChassisModulesServer } = await import('./luv-chassis-server');
    const existing = await getChassisModulesServer();
    if (existing.some((m) => m.slug === slug)) {
      return { error: `Module "${slug}" already exists` };
    }

    return {
      type: 'new_module_proposal' as const,
      slug,
      name,
      category,
      description,
      parameters,
      parameterSchema,
      parameterCount: parameterSchema.length,
      reason,
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
    'View images for a chassis module. Looks up images in the Luv Chassis cog series tagged with the module slug. Returns the first matching image inline.',
  inputSchema: zodSchema(
    z.object({
      moduleSlug: z.string().describe('Module slug (e.g. "eyes", "hair")'),
      limit: z.number().optional().default(1).describe('Number of images to return (default 1)'),
    })
  ),
  execute: async ({ moduleSlug, limit }) => {
    const { getLuvSeriesServer } = await import('./luv/cog-integration-server');
    const { getCogImageUrl } = await import('./cog/images');
    const { createClient: createServerClient } = await import('./supabase-server');

    // Get the chassis series
    const seriesId = await getLuvSeriesServer('chassis');
    if (!seriesId) return { error: 'Chassis series not found' };

    // Find tag ID for this module slug, then get tagged image IDs
    const client = await createServerClient();
    const { data: tag } = await (client as any)
      .from('cog_tags')
      .select('id')
      .eq('name', moduleSlug)
      .maybeSingle();

    if (!tag) return { error: `No tag found for module "${moduleSlug}"` };

    const { data: taggedRows } = await (client as any)
      .from('cog_image_tags')
      .select('image_id')
      .eq('tag_id', tag.id);

    const taggedIds = (taggedRows ?? []).map((t: { image_id: string }) => t.image_id);
    if (taggedIds.length === 0) return { error: `No images tagged "${moduleSlug}"` };

    // Get series images that match
    const { data: seriesImages } = await (client as any)
      .from('cog_images')
      .select('id, filename, storage_path')
      .eq('series_id', seriesId)
      .in('id', taggedIds)
      .order('created_at', { ascending: false });

    const moduleImages = seriesImages ?? [];

    if (moduleImages.length === 0) {
      return { error: `No images tagged "${moduleSlug}" in chassis series` };
    }

    const sliced = moduleImages.slice(0, limit ?? 1);
    return {
      moduleSlug,
      total: moduleImages.length,
      images: sliced.map((img: { id: string; filename: string; storage_path: string }) => ({
        id: img.id,
        filename: img.filename,
        url: getCogImageUrl(img.storage_path),
        storage_path: img.storage_path,
      })),
    };
  },
  toModelOutput: async ({ output }) => {
    const result = output as { error?: string; images?: Array<{ storage_path: string; filename: string }> };
    if (result.error || !result.images?.length) {
      return { type: 'text', value: result.error ?? JSON.stringify(output) };
    }

    const { resolveImageAsBase64 } = await import('./luv-image-utils');
    const parts: Array<{ type: 'text'; text: string } | { type: 'file-data'; data: string; mediaType: string }> = [];

    for (const img of result.images) {
      try {
        const { base64, mediaType } = await resolveImageAsBase64(img.storage_path);
        parts.push({ type: 'text', text: `[${img.filename}]` });
        parts.push({ type: 'file-data', data: base64, mediaType });
      } catch {
        parts.push({ type: 'text', text: `[${img.filename} — could not load]` });
      }
    }

    return { type: 'content', value: parts };
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
    'List all active memories. Use this to check what you already know before saving a duplicate. For a full audit with metadata and operations history, use review_memories instead.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const { getLuvMemoriesServer } = await import('./luv-server');
    const memories = await getLuvMemoriesServer({ activeOnly: true });
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
// Memory Lifecycle Tools
// ============================================================================

export const updateMemory = tool({
  description:
    'Update an existing memory — change its content or category. Use this when a fact you previously saved needs correction, refinement, or reclassification. Always provide a reason explaining why.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('UUID of the memory to update'),
      content: z.string().optional().describe('Updated content (the revised fact)'),
      category: z.string().optional().describe('Updated category'),
      reason: z.string().describe('Why this memory is being updated'),
    })
  ),
  execute: async ({ id, content, category, reason }) => {
    const { updateLuvMemoryServer } = await import('./luv-server');
    const updates: { content?: string; category?: string } = {};
    if (content) updates.content = content;
    if (category) updates.category = category;
    if (Object.keys(updates).length === 0) {
      return { error: 'Provide at least content or category to update' };
    }
    const memory = await updateLuvMemoryServer(id, updates, reason);
    return {
      updated: true,
      id: memory.id,
      content: memory.content,
      category: memory.category,
      updated_count: memory.updated_count,
    };
  },
});

export const archiveMemory = tool({
  description:
    'Archive a memory that is no longer relevant or accurate. Archived memories are excluded from the system prompt but can be restored later. Prefer this over deletion — it preserves the audit trail.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('UUID of the memory to archive'),
      reason: z.string().describe('Why this memory is being archived'),
    })
  ),
  execute: async ({ id, reason }) => {
    const { archiveLuvMemoryServer } = await import('./luv-server');
    const memory = await archiveLuvMemoryServer(id, reason);
    return {
      archived: true,
      id: memory.id,
      content: memory.content,
    };
  },
});

export const mergeMemories = tool({
  description:
    'Merge two or more related memories into a single, better-organized memory. The source memories are archived and a new merged memory is created. Use this to consolidate duplicates or combine related facts.',
  inputSchema: zodSchema(
    z.object({
      source_ids: z
        .array(z.string())
        .min(2)
        .describe('UUIDs of the memories to merge (minimum 2)'),
      merged_content: z
        .string()
        .describe('The combined content for the new memory'),
      category: z
        .string()
        .describe('Category for the merged memory'),
      reason: z
        .string()
        .describe('Why these memories are being merged'),
    })
  ),
  execute: async ({ source_ids, merged_content, category, reason }) => {
    const { mergeLuvMemoriesServer } = await import('./luv-server');
    const memory = await mergeLuvMemoriesServer(
      source_ids,
      merged_content,
      category,
      reason
    );
    return {
      merged: true,
      new_memory_id: memory.id,
      content: memory.content,
      category: memory.category,
      archived_source_ids: source_ids,
    };
  },
});

export const reviewMemories = tool({
  description:
    'Review all active memories with full metadata. Use this for self-directed memory audits — to identify stale, duplicate, contradictory, or poorly categorized memories, then act on them with update/archive/merge tools.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const { getLuvMemoriesServer, getMemoryOperationsServer } = await import(
      './luv-server'
    );
    const [active, archived, recentOps] = await Promise.all([
      getLuvMemoriesServer({ activeOnly: true }),
      getLuvMemoriesServer({ includeArchived: true }).then((all) =>
        all.filter((m) => m.archived_at !== null)
      ),
      getMemoryOperationsServer(undefined, 20),
    ]);

    return {
      active_memories: active.map((m) => ({
        id: m.id,
        content: m.content,
        category: m.category,
        updated_count: m.updated_count,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
      archived_count: archived.length,
      recent_operations: recentOps.map((op) => ({
        memory_id: op.memory_id,
        operation: op.operation_type,
        reason: op.reason,
        created_at: op.created_at,
      })),
      summary: {
        total_active: active.length,
        total_archived: archived.length,
        categories: [...new Set(active.map((m) => m.category))],
      },
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
// Conversation Tools (read past conversations)
// ============================================================================

export const listConversations = tool({
  description:
    'List saved conversations with title, model, and date. Use this to find past sessions worth referencing before starting or continuing work.',
  inputSchema: zodSchema(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Max conversations to return (default 20)'),
    })
  ),
  execute: async ({ limit = 20 }) => {
    const { getLuvConversationsServer } = await import('./luv-server');
    const all = await getLuvConversationsServer();
    const conversations = all.slice(0, limit).map((c) => ({
      id: c.id,
      title: c.title ?? 'Untitled',
      model: c.model,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
    return { conversations, total: all.length };
  },
});

export const readConversation = tool({
  description:
    'Read the messages from a saved conversation. When the conversation is long, the most recent messages are returned. Use list_conversations first to find the conversation ID.',
  inputSchema: zodSchema(
    z.object({
      conversationId: z.string().describe('UUID of the conversation to read'),
      messageLimit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Max messages to return, taken from the end (default 40)'),
    })
  ),
  execute: async ({ conversationId, messageLimit = 40 }) => {
    const { getLuvConversationServer, getLuvMessagesServer } = await import('./luv-server');
    const [conversation, allMessages] = await Promise.all([
      getLuvConversationServer(conversationId),
      getLuvMessagesServer(conversationId),
    ]);

    const truncated = allMessages.length > messageLimit;
    const messages = allMessages.slice(-messageLimit).map((m) => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    }));

    return {
      id: conversation.id,
      title: conversation.title ?? 'Untitled',
      model: conversation.model,
      created_at: conversation.created_at,
      total_messages: allMessages.length,
      truncated,
      ...(truncated && { note: `Showing last ${messageLimit} of ${allMessages.length} messages` }),
      messages,
    };
  },
});

// ============================================================================
// Soul Modulation Tool (autonomous trait adjustment)
// ============================================================================

// SOUL_TRAITS is a readonly const tuple — z.enum requires a mutable tuple type.
// This cast is safe because the underlying values are never mutated.
const traitEnum = z.enum(SOUL_TRAITS as unknown as [string, ...string[]]);

export const adjustSoulTraits = tool({
  description:
    'Adjust your own personality traits in real time. Changes are persisted to the database and carry across conversations. Provide a partial patch with only the traits you want to change (1–10 scale). Include a note explaining why you are making the adjustment.',
  inputSchema: zodSchema(
    z.object({
      patch: z
        .record(traitEnum, z.number().int().min(1).max(10))
        .describe('Partial trait update — only include the traits you want to change'),
      note: z
        .string()
        .describe('Brief explanation for why you are adjusting these traits'),
      context: z
        .string()
        .optional()
        .describe('Optional context label (e.g. technical_discussion, creative_brainstorming)'),
    })
  ),
  execute: async ({ patch, note, context }) => {
    const character = await getLuvCharacterServer();
    if (!character) return { error: 'No character found' };

    const validation = validateTraitPatch(patch);
    if (!validation.valid) {
      return { error: 'Invalid trait patch', details: validation.errors };
    }

    // Fetch current traits
    const current = await getCurrentSoulConfigServer(character.id);
    const newTraits = applyTraitPatch(current.traits, patch);

    // Persist as autonomous change
    const config = await insertSoulConfigServer({
      character_id: character.id,
      session_id: null,
      preset_id: null,
      traits: newTraits,
      context: context ?? null,
      modified_by: 'autonomous',
      note,
    });

    return {
      success: true,
      previous: current.traits,
      updated: newTraits,
      changed: Object.keys(patch),
      config_id: config.id,
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
const adjustVoice = tool({
  description:
    'Adjust voice synthesis settings. Change the ElevenLabs voice ID, speed, stability, or style. ' +
    'Changes persist across conversations. You can proactively adjust voice parameters based on ' +
    'conversational context — e.g., lower speed for thoughtful responses, increase style for playful ones. ' +
    'The user may also paste an ElevenLabs voice ID and ask you to switch.',
  inputSchema: zodSchema(
    z.object({
      voiceId: z.string().optional().describe('ElevenLabs voice ID to switch to'),
      speed: z.number().min(0.5).max(2.0).optional().describe('Speech speed (0.5=very slow, 1.0=normal, 2.0=fast)'),
      stability: z.number().min(0).max(1).optional().describe('Voice stability (0=expressive/variable, 1=stable/consistent)'),
      style: z.number().min(0).max(1).optional().describe('Style exaggeration (0=neutral, 1=amplified character)'),
      reason: z.string().optional().describe('Why this adjustment is being made'),
    })
  ),
  execute: async ({ voiceId, speed, stability, style, reason }) => {
    // Use a fixed user ID for now (single user system)
    const { getLuvCharacterServer } = await import('./luv-server');
    const character = await getLuvCharacterServer();
    if (!character) return { error: 'Character not found' };

    // Get the auth user ID from the character's created_by or use a lookup
    const { createClient } = await import('./supabase-server');
    const client = await createClient();
    const { data: users } = await (client as any)
      .from('luv_heartbeat_config')
      .select('user_id')
      .limit(1);

    const userId = users?.[0]?.user_id;
    if (!userId) return { error: 'No user config found' };

    const updates: Record<string, unknown> = {};
    if (voiceId !== undefined) updates.voiceId = voiceId;
    if (speed !== undefined) updates.speed = speed;
    if (stability !== undefined) updates.stability = stability;
    if (style !== undefined) updates.style = style;

    const newConfig = await updateVoiceConfig(userId, updates);

    return {
      success: true,
      config: newConfig,
      reason,
    };
  },
});

const acknowledgeHeartbeat = tool({
  description:
    'Mark a heartbeat nudge as acknowledged after you have surfaced it in conversation. ' +
    'Call this for each nudge you acted on — the nudge ID is provided in the heartbeat observations section of your system prompt.',
  inputSchema: zodSchema(
    z.object({
      nudgeId: z.string().describe('The heartbeat event ID to acknowledge'),
    })
  ),
  execute: async ({ nudgeId }) => {
    await acknowledgeNudge(nudgeId);
    return { acknowledged: true, nudgeId };
  },
});

// ============================================================================

/**
 * All Luv tools. Tools are split into two tiers:
 *
 * - **Core tools** (~15): Always loaded into context. These are the tools Luv
 *   uses in typical conversations — soul/chassis reads, proposals, memory, traits.
 *
 * - **Deferred tools** (~30): Marked with `deferLoading: true` so they're only
 *   loaded when Claude discovers them via tool search. Includes research, artifacts,
 *   reviews, playground, changelog, and less-frequently-used utilities.
 *
 * Combined with `toolSearchBm25` (registered in the chat route), this keeps the
 * active tool set small while making all capabilities discoverable on demand.
 */

const DEFER = { anthropic: { deferLoading: true } } as const;

export const luvTools = {
  // ── Core tools (always loaded) ──────────────────────────────────────
  read_soul: readSoul,
  read_chassis: readChassis,
  list_chassis_modules: listChassisModules,
  read_chassis_module: readChassisModule,
  review_chassis_module: reviewChassisModule,
  propose_soul_change: proposeSoulChange,
  propose_module_change: proposeModuleChange,
  propose_module_changes: proposeModuleChanges,
  save_memory: saveMemory,
  update_memory: updateMemory,
  list_memories: listMemories,
  adjust_soul_traits: adjustSoulTraits,
  list_generations: listGenerations,
  acknowledge_heartbeat: acknowledgeHeartbeat,

  // ── Deferred tools (discovered via tool search) ─────────────────────
  propose_chassis_change: { ...proposeChassisChange, providerOptions: DEFER },
  propose_new_module: { ...proposeNewModule, providerOptions: DEFER },
  propose_facet_change: { ...proposeFacetChange, providerOptions: DEFER },
  view_reference_image: { ...viewReferenceImage, providerOptions: DEFER },
  view_module_media: { ...viewModuleMedia, providerOptions: DEFER },
  archive_memory: { ...archiveMemory, providerOptions: DEFER },
  merge_memories: { ...mergeMemories, providerOptions: DEFER },
  review_memories: { ...reviewMemories, providerOptions: DEFER },
  adjust_voice: { ...adjustVoice, providerOptions: DEFER },
  list_references: { ...listReferences, providerOptions: DEFER },
  list_prompt_templates: { ...listPromptTemplates, providerOptions: DEFER },
  compose_context_pack: { ...composeContextPack, providerOptions: DEFER },
  evaluate_generation: { ...evaluateGeneration, providerOptions: DEFER },
  list_conversations: { ...listConversations, providerOptions: DEFER },
  read_conversation: { ...readConversation, providerOptions: DEFER },
  ...applyDeferLoading(luvResearchTools),
  ...applyDeferLoading(luvArtifactTools),
  ...applyDeferLoading(luvReviewTools),
  ...applyDeferLoading(luvPlaygroundTools),
  ...applyDeferLoading(luvChangelogTools),
};

/** Mark all tools in a bundle as deferred */
function applyDeferLoading<T extends Record<string, object>>(tools: T): T {
  const result = {} as Record<string, object>;
  for (const [name, t] of Object.entries(tools)) {
    result[name] = { ...t, providerOptions: DEFER };
  }
  return result as T;
}
