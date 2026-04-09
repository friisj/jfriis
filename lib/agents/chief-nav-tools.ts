/**
 * Chief: Navigation Tools
 *
 * Generate internal URLs for any entity in the system.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createClient } from '../supabase-server';

const ENTITY_URL_MAP: Record<string, string> = {
  studio_project: '/studio/{slug}',
  log_entry: '/admin/log/{id}/edit',
  cog_series: '/tools/cog/{id}',
  venture: '/admin/ventures/{id}/edit',
  assumption: '/admin/assumptions/{id}/edit',
  hypothesis: '/admin/hypotheses/{id}/edit',
  experiment: '/admin/experiments/{id}/edit',
  specimen: '/admin/specimens/{id}/edit',
  luv_chat: '/tools/luv/chat',
  chat: '/chat',
  studio_index: '/studio',
  tools: '/tools',
  admin: '/admin',
};

export const generateLink = tool({
  description:
    'Generate an internal URL for any entity in the system. ' +
    'For studio projects, pass the slug. For other entities, pass the ID. ' +
    'Returns a clickable URL the user can navigate to.',
  inputSchema: zodSchema(
    z.object({
      entityType: z.string().describe(
        'Entity type: studio_project, log_entry, cog_series, venture, assumption, ' +
        'hypothesis, experiment, specimen, luv_chat, chat, studio_index, tools, admin'
      ),
      id: z.string().optional().describe('Entity UUID (for most types)'),
      slug: z.string().optional().describe('Entity slug (for studio_project)'),
    })
  ),
  execute: async ({ entityType, id, slug }) => {
    const pattern = ENTITY_URL_MAP[entityType];
    if (!pattern) {
      return { success: false, error: `Unknown entity type: ${entityType}` };
    }

    // Static routes
    if (!pattern.includes('{')) {
      return { success: true, url: pattern, entityType };
    }

    // Resolve slug for studio projects
    if (entityType === 'studio_project') {
      if (slug) {
        return { success: true, url: `/studio/${slug}`, entityType };
      }
      if (id) {
        const client = await createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (client as any)
          .from('studio_projects')
          .select('slug')
          .eq('id', id)
          .single();
        if (data) return { success: true, url: `/studio/${data.slug}`, entityType };
      }
      return { success: false, error: 'Need slug or id for studio_project' };
    }

    // ID-based routes
    if (id) {
      const url = pattern.replace('{id}', id);
      return { success: true, url, entityType };
    }

    return { success: false, error: `Need id for ${entityType}` };
  },
});

export const chiefNavTools = {
  generate_link: generateLink,
};
