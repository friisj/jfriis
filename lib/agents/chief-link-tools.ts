/**
 * Chief: Entity Link Tools
 *
 * Manage relationships between any records in the system.
 * Wraps existing entity-links.ts functions as agent tools.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { linkEntities, unlinkEntities, getLinkedEntities } from '../entity-links';
import type { LinkableEntityType, LinkType } from '../types/entity-relationships';

export const linkEntitiesT = tool({
  description:
    'Create a relationship between two entities. Common types: ' +
    'studio_project, experiment, hypothesis, log_entry, venture, assumption, asset_spike. ' +
    'Common link types: related, validates, tests, supports, documents, explores, informs, derived_from.',
  inputSchema: zodSchema(
    z.object({
      sourceType: z.string().describe('Source entity type (e.g. "studio_project", "log_entry")'),
      sourceId: z.string().uuid().describe('Source entity UUID'),
      targetType: z.string().describe('Target entity type'),
      targetId: z.string().uuid().describe('Target entity UUID'),
      linkType: z.string().optional().describe('Relationship type (default: "related")'),
      notes: z.string().optional().describe('Notes about the relationship'),
    })
  ),
  execute: async ({ sourceType, sourceId, targetType, targetId, linkType, notes }) => {
    try {
      const link = await linkEntities(
        { type: sourceType as LinkableEntityType, id: sourceId },
        { type: targetType as LinkableEntityType, id: targetId },
        (linkType ?? 'related') as LinkType,
        notes ? { notes } : {},
      );
      return { success: true, linkId: link.id, linkType: link.link_type };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create link' };
    }
  },
});

export const unlinkEntitiesT = tool({
  description: 'Remove a relationship between two entities.',
  inputSchema: zodSchema(
    z.object({
      sourceType: z.string(),
      sourceId: z.string().uuid(),
      targetType: z.string(),
      targetId: z.string().uuid(),
      linkType: z.string().optional().describe('Specific link type to remove (default: "related")'),
    })
  ),
  execute: async ({ sourceType, sourceId, targetType, targetId, linkType }) => {
    try {
      await unlinkEntities(
        { type: sourceType as LinkableEntityType, id: sourceId },
        { type: targetType as LinkableEntityType, id: targetId },
        (linkType ?? 'related') as LinkType,
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove link' };
    }
  },
});

export const getLinkedEntitiesT = tool({
  description:
    'Get all entities linked to a given entity. Returns links with their types and metadata.',
  inputSchema: zodSchema(
    z.object({
      entityType: z.string().describe('Entity type to query'),
      entityId: z.string().uuid().describe('Entity UUID'),
    })
  ),
  execute: async ({ entityType, entityId }) => {
    try {
      const links = await getLinkedEntities({ type: entityType as LinkableEntityType, id: entityId });
      return { links, count: links.length };
    } catch (err) {
      return { links: [], count: 0, error: err instanceof Error ? err.message : 'Query failed' };
    }
  },
});

export const chiefLinkTools = {
  link_entities: linkEntitiesT,
  unlink_entities: unlinkEntitiesT,
  get_linked_entities: getLinkedEntitiesT,
};
