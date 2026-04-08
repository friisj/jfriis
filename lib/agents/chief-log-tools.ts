/**
 * Chief: Log Entry Tools
 *
 * Create and search log entries — working research documentation.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createClient } from '../supabase-server';

export const createLogEntry = tool({
  description:
    'Create a log entry — working research documentation. Use for recording insights, ' +
    'decisions, observations, or any substantive note worth persisting. ' +
    'Content is markdown (stored as JSONB { markdown: "..." }). Private by default.',
  inputSchema: zodSchema(
    z.object({
      title: z.string().describe('Entry title'),
      slug: z.string().describe('URL-friendly slug (kebab-case)'),
      content: z.string().describe('Markdown content'),
      entryDate: z.string().optional().describe('Date (YYYY-MM-DD, default: today)'),
      type: z.string().optional().describe('Entry type: research, idea, decision, update, etc.'),
      tags: z.array(z.string()).optional(),
      studioProjectSlug: z.string().optional().describe('Link to a studio project by slug'),
      isPrivate: z.boolean().optional().describe('Private entry (default: true)'),
    })
  ),
  execute: async ({ title, slug, content, entryDate, type, tags, studioProjectSlug, isPrivate }) => {
    const client = await createClient();

    let studioProjectId: string | null = null;
    if (studioProjectSlug) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: proj } = await (client as any)
        .from('studio_projects')
        .select('id')
        .eq('slug', studioProjectSlug)
        .single();
      if (proj) studioProjectId = proj.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (client as any)
      .from('log_entries')
      .insert({
        title,
        slug,
        content: { markdown: content },
        entry_date: entryDate ?? new Date().toISOString().split('T')[0],
        type: type ?? 'research',
        tags: tags ?? [],
        studio_project_id: studioProjectId,
        published: false,
        is_private: isPrivate ?? true,
      })
      .select('id, slug, title, type, entry_date')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, ...data, editUrl: `/admin/log/${data.id}/edit` };
  },
});

export const searchLogEntries = tool({
  description: 'Search log entries by keyword in title.',
  inputSchema: zodSchema(
    z.object({
      query: z.string().describe('Search keyword'),
      limit: z.number().int().min(1).max(30).optional(),
    })
  ),
  execute: async ({ query, limit }) => {
    const client = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (client as any)
      .from('log_entries')
      .select('id, title, slug, type, tags, entry_date, published, is_private')
      .ilike('title', `%${query}%`)
      .order('entry_date', { ascending: false })
      .limit(limit ?? 10);
    return { entries: data ?? [], count: data?.length ?? 0 };
  },
});

export const chiefLogTools = {
  create_log_entry: createLogEntry,
  search_log_entries: searchLogEntries,
};
