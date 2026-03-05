/**
 * Luv: Agentic Tool Definitions
 *
 * Tools that let Luv introspect and propose changes to her own soul and chassis.
 * Read tools execute immediately; write tools return proposals for human approval.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { getLuvCharacterServer } from './luv-server';

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
  compose_context_pack: composeContextPack,
  evaluate_generation: evaluateGeneration,
};
