/**
 * Luv: Research Tool Definitions
 *
 * Agent tools for CRUD on the luv_research table.
 * All tools execute immediately (no approval flow) — research entries
 * are the agent's own working notes.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';

const researchKindEnum = z.enum(['hypothesis', 'experiment', 'decision', 'insight', 'evidence']);
const researchStatusEnum = z.enum(['open', 'active', 'resolved', 'archived']);

export const createResearch = tool({
  description:
    'Create a research entry — hypothesis, experiment, decision, insight, or evidence. Use parent_id to link entries (e.g. experiment → hypothesis, evidence → experiment).',
  inputSchema: zodSchema(
    z.object({
      kind: researchKindEnum.describe('Type of research entry'),
      title: z.string().describe('Concise title'),
      body: z.string().optional().describe('Detailed description, methodology, or rationale'),
      status: researchStatusEnum.optional().describe('Defaults to "open"'),
      tags: z.array(z.string()).optional().describe('Categorization tags'),
      metadata: z.record(z.string(), z.unknown()).optional().describe(
        'Kind-specific data (e.g. validation_criteria for hypotheses, confidence for evidence)'
      ),
      parent_id: z.string().optional().describe('UUID of parent entry (e.g. hypothesis ID for an experiment)'),
    })
  ),
  execute: async (input) => {
    const { createLuvResearchServer } = await import('./luv-research-server');
    const entry = await createLuvResearchServer(input);
    return { created: true, ...entry };
  },
});

export const updateResearch = tool({
  description:
    'Update an existing research entry. Can change title, body, status, tags, or metadata.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('UUID of the research entry'),
      title: z.string().optional(),
      body: z.string().nullable().optional(),
      status: researchStatusEnum.optional(),
      tags: z.array(z.string()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
  ),
  execute: async ({ id, ...updates }) => {
    const { updateLuvResearchServer } = await import('./luv-research-server');
    const entry = await updateLuvResearchServer(id, updates);
    return { updated: true, ...entry };
  },
});

export const deleteResearch = tool({
  description: 'Delete a research entry by ID.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('UUID of the research entry to delete'),
    })
  ),
  execute: async ({ id }) => {
    const { deleteLuvResearchServer } = await import('./luv-research-server');
    await deleteLuvResearchServer(id);
    return { deleted: true, id };
  },
});

export const getResearch = tool({
  description:
    'Get a single research entry with its children (linked experiments, evidence, etc.).',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('UUID of the research entry'),
    })
  ),
  execute: async ({ id }) => {
    const { getLuvResearchWithChildrenServer } = await import('./luv-research-server');
    const result = await getLuvResearchWithChildrenServer(id);
    if (!result) return { error: 'Research entry not found' };
    return result;
  },
});

export const listResearch = tool({
  description:
    'List research entries, optionally filtered by kind, status, or parent_id.',
  inputSchema: zodSchema(
    z.object({
      kind: researchKindEnum.optional().describe('Filter by kind'),
      status: researchStatusEnum.optional().describe('Filter by status'),
      parent_id: z.string().optional().describe('Filter by parent entry'),
    })
  ),
  execute: async (filters) => {
    const { listLuvResearchServer } = await import('./luv-research-server');
    const entries = await listLuvResearchServer(filters);
    return { entries, count: entries.length };
  },
});

export const searchResearch = tool({
  description:
    'Full-text search across research entry titles and bodies.',
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe('Search query'),
      kind: researchKindEnum.optional().describe('Optional kind filter'),
    })
  ),
  execute: async ({ query, kind }) => {
    const { searchLuvResearchServer } = await import('./luv-research-server');
    const entries = await searchLuvResearchServer(query, kind);
    return { entries, count: entries.length };
  },
});

export const luvResearchTools = {
  create_research: createResearch,
  update_research: updateResearch,
  delete_research: deleteResearch,
  get_research: getResearch,
  list_research: listResearch,
  search_research: searchResearch,
};
