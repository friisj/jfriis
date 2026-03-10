/**
 * Luv: Artifact Tool Definitions
 *
 * Agent tools for creating and managing markdown artifacts.
 * All tools execute immediately (no approval flow) — artifacts
 * are Luv's own authored documents.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';

const artifactStatusEnum = z.enum(['draft', 'published', 'archived']);

export const createArtifact = tool({
  description:
    'Create a new markdown artifact — a document like a character brief, style guide, analysis, tutorial, or reference sheet. The slug must be unique and URL-friendly (kebab-case).',
  inputSchema: zodSchema(
    z.object({
      title: z.string().describe('Document title'),
      slug: z.string().describe('URL-friendly identifier (kebab-case, e.g. "character-brief")'),
      content: z.string().describe('Markdown content of the document'),
      tags: z.array(z.string()).optional().describe('Categorization tags'),
      status: artifactStatusEnum.optional().describe('Defaults to "draft"'),
    })
  ),
  execute: async (input) => {
    const { createLuvArtifactServer } = await import('./luv-artifacts-server');
    const artifact = await createLuvArtifactServer(input);
    return { created: true, id: artifact.id, title: artifact.title, slug: artifact.slug, version: artifact.version };
  },
});

export const updateArtifact = tool({
  description:
    'Update an existing artifact. Can change title, content, tags, or status. Content updates auto-increment the version number.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('UUID of the artifact'),
      title: z.string().optional(),
      content: z.string().optional().describe('New markdown content (replaces entire document)'),
      tags: z.array(z.string()).optional(),
      status: artifactStatusEnum.optional(),
    })
  ),
  execute: async ({ id, ...updates }) => {
    const { updateLuvArtifactServer } = await import('./luv-artifacts-server');
    const artifact = await updateLuvArtifactServer(id, updates);
    return { updated: true, id: artifact.id, title: artifact.title, version: artifact.version };
  },
});

export const getArtifact = tool({
  description:
    'Get a single artifact by ID or slug. Returns the full content.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().optional().describe('UUID of the artifact'),
      slug: z.string().optional().describe('Slug of the artifact'),
    })
  ),
  execute: async ({ id, slug }) => {
    if (!id && !slug) return { error: 'Provide either id or slug' };
    if (id) {
      const { getLuvArtifactServer } = await import('./luv-artifacts-server');
      const artifact = await getLuvArtifactServer(id);
      if (!artifact) return { error: 'Artifact not found' };
      return artifact;
    }
    const { getLuvArtifactBySlugServer } = await import('./luv-artifacts-server');
    const artifact = await getLuvArtifactBySlugServer(slug!);
    if (!artifact) return { error: 'Artifact not found' };
    return artifact;
  },
});

export const listArtifacts = tool({
  description:
    'List all artifacts, optionally filtered by status or tag.',
  inputSchema: zodSchema(
    z.object({
      status: artifactStatusEnum.optional().describe('Filter by status'),
      tag: z.string().optional().describe('Filter by tag'),
    })
  ),
  execute: async (filters) => {
    const { listLuvArtifactsServer } = await import('./luv-artifacts-server');
    const artifacts = await listLuvArtifactsServer(filters);
    return {
      artifacts: artifacts.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        status: a.status,
        tags: a.tags,
        version: a.version,
        updated_at: a.updated_at,
      })),
      count: artifacts.length,
    };
  },
});

export const deleteArtifact = tool({
  description: 'Delete an artifact by ID.',
  inputSchema: zodSchema(
    z.object({
      id: z.string().describe('UUID of the artifact to delete'),
    })
  ),
  execute: async ({ id }) => {
    const { deleteLuvArtifactServer } = await import('./luv-artifacts-server');
    await deleteLuvArtifactServer(id);
    return { deleted: true, id };
  },
});

export const luvArtifactTools = {
  create_artifact: createArtifact,
  update_artifact: updateArtifact,
  get_artifact: getArtifact,
  list_artifacts: listArtifacts,
  delete_artifact: deleteArtifact,
};
