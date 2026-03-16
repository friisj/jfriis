/**
 * Luv: Changelog Agent Tools
 *
 * Tools for reading and writing changelog entries — Luv's record of her own evolution.
 * read_changelog is a standard read tool (no approval).
 * add_changelog_entry writes immediately (no proposal flow — changelog entries are additive
 * and low-risk, and the agent should be able to log changes as they happen).
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';

const categoryEnum = z.enum(['architecture', 'behavior', 'capability', 'tooling', 'fix']);

export const readChangelog = tool({
  description:
    'Read recent changelog entries — the record of how Luv\'s architecture, behaviors, and capabilities have evolved. Returns entries newest-first. Use this to orient yourself at session start or to review history before proposing changes.',
  inputSchema: zodSchema(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Max entries to return (default 10)'),
      category: categoryEnum
        .optional()
        .describe('Filter by category: architecture | behavior | capability | tooling | fix'),
    })
  ),
  execute: async ({ limit = 10, category }) => {
    const { getLuvChangelogServer } = await import('./luv-changelog-server');
    let entries = await getLuvChangelogServer(category ? 50 : limit);
    if (category) {
      entries = entries.filter((e) => e.category === category).slice(0, limit);
    }
    return {
      entries: entries.map((e) => ({
        id: e.id,
        date: e.date,
        title: e.title,
        summary: e.summary,
        category: e.category,
        details: e.details,
      })),
      total: entries.length,
    };
  },
});

export const addChangelogEntry = tool({
  description:
    'Add a new entry to the changelog — use this when a significant change to Luv\'s architecture, behaviors, or capabilities has been made or is being logged. This is your self-documentation tool: write clearly so future-you understands what changed and why.',
  inputSchema: zodSchema(
    z.object({
      title: z.string().max(120).describe('Short title (e.g. "Added physiological response module")'),
      summary: z
        .string()
        .max(500)
        .describe('One- or two-sentence summary of what changed and why'),
      category: categoryEnum.describe(
        'architecture (structural/data changes) | behavior (how Luv acts) | capability (new tools/features) | tooling (dev tooling) | fix (corrections)'
      ),
      details: z
        .string()
        .optional()
        .describe('Optional long-form details: motivation, trade-offs, design decisions'),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe('ISO date (YYYY-MM-DD). Defaults to today if omitted.'),
    })
  ),
  execute: async ({ title, summary, category, details, date }) => {
    const { createLuvChangelogEntryServer } = await import('./luv-changelog-server');
    const entry = await createLuvChangelogEntryServer({
      title,
      summary,
      category,
      details: details ?? null,
      date: date ?? new Date().toISOString().slice(0, 10),
    });
    return {
      created: true,
      id: entry.id,
      date: entry.date,
      title: entry.title,
      category: entry.category,
    };
  },
});

export const luvChangelogTools = {
  read_changelog: readChangelog,
  add_changelog_entry: addChangelogEntry,
};
