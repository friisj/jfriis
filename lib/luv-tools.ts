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

// ============================================================================
// Tool Registry
// ============================================================================

export const luvTools = {
  read_soul: readSoul,
  read_chassis: readChassis,
  list_references: listReferences,
  list_prompt_templates: listPromptTemplates,
  propose_soul_change: proposeSoulChange,
  propose_chassis_change: proposeChassisChange,
};
