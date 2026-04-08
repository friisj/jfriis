/**
 * Chief: Artifact Tools
 *
 * CRUD operations for structured documents that Chief drafts and manages.
 * Artifacts persist across conversations — use for plans, summaries,
 * decision records, or anything worth referencing later.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createClient } from '../supabase-server';

const AGENT = 'chief';

export const createArtifact = tool({
  description:
    'Create a new artifact — a structured document that persists across conversations. ' +
    'Use for plans, decision records, summaries, or any content worth referencing later. ' +
    'Content is markdown. Slug must be unique and URL-friendly (kebab-case).',
  inputSchema: zodSchema(
    z.object({
      title: z.string().describe('Artifact title'),
      slug: z.string().describe('URL-friendly identifier (kebab-case, e.g. "q2-priorities")'),
      content: z.string().describe('Full markdown content'),
      tags: z.array(z.string()).optional().describe('Categorization tags'),
      status: z.enum(['draft', 'published', 'archived']).optional().describe('Status (default: draft)'),
    })
  ),
  execute: async ({ title, slug, content, tags, status }) => {
    const client = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any)
      .from('agent_artifacts')
      .insert({ agent: AGENT, title, slug, content, tags: tags ?? [], status: status ?? 'draft' })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, id: data.id, slug: data.slug, title: data.title };
  },
});

export const updateArtifact = tool({
  description: 'Update an existing artifact. Pass only the fields you want to change.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().uuid().describe('Artifact UUID'),
      title: z.string().optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
    })
  ),
  execute: async ({ id, ...patch }) => {
    const client = await createClient();
    const updates: Record<string, unknown> = {};
    if (patch.title !== undefined) updates.title = patch.title;
    if (patch.content !== undefined) updates.content = patch.content;
    if (patch.tags !== undefined) updates.tags = patch.tags;
    if (patch.status !== undefined) updates.status = patch.status;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any)
      .from('agent_artifacts')
      .update(updates)
      .eq('id', id)
      .select('id, slug, title, status, updated_at')
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, ...data };
  },
});

export const getArtifact = tool({
  description: 'Fetch an artifact by slug.',
  inputSchema: zodSchema(
    z.object({
      slug: z.string().describe('Artifact slug'),
    })
  ),
  execute: async ({ slug }) => {
    const client = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any)
      .from('agent_artifacts')
      .select('*')
      .eq('agent', AGENT)
      .eq('slug', slug)
      .single();
    if (error) return { success: false, error: `Artifact "${slug}" not found` };
    return { success: true, artifact: data };
  },
});

export const listArtifacts = tool({
  description: 'List artifacts with optional filters.',
  inputSchema: zodSchema(
    z.object({
      status: z.enum(['draft', 'published', 'archived']).optional(),
      tag: z.string().optional().describe('Filter by tag'),
      limit: z.number().int().min(1).max(50).optional(),
    })
  ),
  execute: async ({ status, tag, limit }) => {
    const client = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client as any)
      .from('agent_artifacts')
      .select('id, slug, title, tags, status, created_at, updated_at')
      .eq('agent', AGENT)
      .order('updated_at', { ascending: false })
      .limit(limit ?? 20);
    if (status) query = query.eq('status', status);
    if (tag) query = query.contains('tags', [tag]);
    const { data } = await query;
    return { artifacts: data ?? [], count: data?.length ?? 0 };
  },
});

export const chiefArtifactTools = {
  create_artifact: createArtifact,
  update_artifact: updateArtifact,
  get_artifact: getArtifact,
  list_artifacts: listArtifacts,
};
