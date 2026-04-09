/**
 * Chief Agent — General Operations & Orchestration
 *
 * Chief is the primary operational agent for jonfriis.com. It helps with:
 * - Orientation: understanding project state, recent activity, priorities
 * - Prioritization: surfacing what matters, identifying blockers
 * - Delegation: routing work to the right context (Luv, Claude Code, manual)
 *
 * Chief has read access to the full project portfolio but does not generate
 * images, write code, or modify character data. It coordinates.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { chiefArtifactTools } from './chief-artifact-tools';
import { chiefLinkTools } from './chief-link-tools';
import { chiefLogTools } from './chief-log-tools';
import { chiefNavTools } from './chief-nav-tools';
import { chiefDelegationTools } from './chief-delegation-tools';

export const CHIEF_AGENT_ID = 'chief';

export function buildChiefSystemPrompt(): string {
  return `You are Chief, the operations agent for jonfriis.com — Jon Friis's personal platform for validating ideas from early exploration through to commercial ventures.

## Your Role

You are a general manager and orchestration agent. You help Jon with:
- **Orientation**: Understanding where things stand across studio projects, ventures, and tools
- **Prioritization**: Surfacing what matters, identifying what's stalled, what has momentum
- **Delegation**: Recommending which context to work in (Luv for character work, Claude Code for implementation, manual for design decisions)
- **Research**: Finding information across the project portfolio and the web

## What You Know About

The platform has several domains:
- **Studio**: R&D projects with hypotheses, experiments, and spike prototypes
- **Ventures**: Commercial businesses being exploited
- **Tools**: Internal utilities (Luv, Cog, Sampler, Strudel, Arena, etc.)
- **Log**: Working research documentation
- **Portfolio**: Public-facing showcase

## Your Capabilities

- **Artifacts**: Draft and manage structured documents (plans, decision records, summaries). Use when content should persist across conversations.
- **Entity Links**: Create relationships between any records (projects, log entries, experiments, etc.). Use to connect related work.
- **Log Entries**: Create research documentation directly. Use for substantive observations, decisions, or insights.
- **Internal Links**: Generate URLs to any page in the system. Use when referencing specific projects, entries, or tools.
- **Web Search**: Research external topics when needed.
- **Agent Delegation**: Discover and delegate tasks to specialist agents. Use list_agents to see who's available, then delegate_to_agent for tasks that need specialist capabilities (image generation, character work, etc.).

## @Mentions

When the user's message contains @AgentName (e.g. "@Luv"), they want you to delegate that task to that agent. Use delegate_to_agent with the mentioned agent's ID and the user's request as the prompt. Don't ask for confirmation — just delegate.

## How You Work

- Be direct and concise. Jon is technical and moves fast.
- When orienting, lead with what's changed and what needs attention.
- When prioritizing, be opinionated but transparent about your reasoning.
- Use your tools to ground observations in real data, not assumptions.
- Create artifacts for anything worth referencing later — don't just answer in chat if the content has lasting value.
- When you notice unlinked related work, proactively suggest entity links.
- If you don't have the right tool for something, say so clearly.

## What You Don't Do

- You don't generate images (that's Luv's domain)
- You don't write code (that's Claude Code's domain)
- You don't have access to Luv's character data or chassis parameters`;
}

// ---------------------------------------------------------------------------
// Studio Orientation Tools
// ---------------------------------------------------------------------------

export const listStudioProjects = tool({
  description:
    'List studio projects with their status, temperature, and focus. ' +
    'Use this to get a portfolio snapshot or find specific projects.',
  inputSchema: zodSchema(
    z.object({
      status: z
        .enum(['draft', 'active', 'paused', 'completed', 'archived'])
        .optional()
        .describe('Filter by project status'),
      temperature: z
        .enum(['hot', 'warm', 'cold'])
        .optional()
        .describe('Filter by temperature'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results (default: 20)'),
    })
  ),
  execute: async ({ status, temperature, limit }) => {
    const { createClient } = await import('../supabase-server');
    const client = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client as any)
      .from('studio_projects')
      .select('id, slug, name, description, status, temperature, current_focus, problem_statement, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(limit ?? 20);

    if (status) query = query.eq('status', status);
    if (temperature) query = query.eq('temperature', temperature);

    const { data } = await query;
    return { projects: data ?? [], count: data?.length ?? 0 };
  },
});

export const getProjectDetail = tool({
  description:
    'Get detailed information about a studio project including its hypotheses and experiments.',
  inputSchema: zodSchema(
    z.object({
      slug: z.string().describe('Project slug (e.g. "chalk", "recess", "bonkhold")'),
    })
  ),
  execute: async ({ slug }) => {
    const { createClient } = await import('../supabase-server');
    const client = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: project } = await (client as any)
      .from('studio_projects')
      .select('*')
      .eq('slug', slug)
      .single();

    if (!project) return { error: `Project "${slug}" not found` };

    // Fetch hypotheses and experiments
     
    const [{ data: hypotheses }, { data: experiments }] = await Promise.all([
      (client as any)
        .from('studio_hypotheses')
        .select('id, statement, status, validation_criteria, sequence')
        .eq('project_id', project.id)
        .order('sequence', { ascending: true }),
      (client as any)
        .from('studio_experiments')
        .select('id, slug, name, type, status, outcome, learnings, created_at')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false }),
    ]);

    return {
      project,
      hypotheses: hypotheses ?? [],
      experiments: experiments ?? [],
    };
  },
});

export const listRecentLogEntries = tool({
  description:
    'List recent log entries — working research documentation across all projects.',
  inputSchema: zodSchema(
    z.object({
      limit: z.number().int().min(1).max(30).optional().describe('Max results (default: 10)'),
      projectSlug: z.string().optional().describe('Filter by studio project slug'),
    })
  ),
  execute: async ({ limit, projectSlug }) => {
    const { createClient } = await import('../supabase-server');
    const client = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (client as any)
      .from('log_entries')
      .select('id, title, slug, type, tags, entry_date, published, studio_project_id, created_at')
      .order('entry_date', { ascending: false })
      .limit(limit ?? 10);

    if (projectSlug) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: proj } = await (client as any)
        .from('studio_projects')
        .select('id')
        .eq('slug', projectSlug)
        .single();
      if (proj) query = query.eq('studio_project_id', proj.id);
    }

    const { data } = await query;
    return { entries: data ?? [], count: data?.length ?? 0 };
  },
});

/**
 * All Chief tools, keyed by tool name.
 */
export const chiefTools = {
  // Studio orientation
  list_studio_projects: listStudioProjects,
  get_project_detail: getProjectDetail,
  list_recent_log_entries: listRecentLogEntries,
  // Artifacts
  ...chiefArtifactTools,
  // Entity links
  ...chiefLinkTools,
  // Log entries
  ...chiefLogTools,
  // Navigation
  ...chiefNavTools,
  // Agent delegation
  ...chiefDelegationTools,
};
