/**
 * Strudel Agent: AI SDK Tool Definitions
 *
 * Client-action tools return { type: 'strudel_action', action, ... } objects.
 * The client chat sidebar intercepts these and dispatches to the Strudel engine.
 *
 * Server-side tools execute directly (DB reads/writes).
 */

import { tool, zodSchema } from 'ai'
import { z } from 'zod'
import {
  saveStrudelTrack,
  getStrudelTrack,
  listStrudelTracks,
} from './strudel-server'

// ============================================================================
// Client-Action Tools (return actions for client-side dispatch)
// ============================================================================

export const editPattern = tool({
  description:
    'Replace the entire editor content with new Strudel code. The code will appear in the editor. Always use this before evaluate to write or rewrite patterns.',
  inputSchema: zodSchema(
    z.object({
      code: z.string().describe('Complete Strudel pattern code'),
      description: z
        .string()
        .describe('Brief description of what this pattern does musically'),
    })
  ),
  execute: async ({ code, description }) => ({
    type: 'strudel_action' as const,
    action: 'edit_pattern' as const,
    code,
    description,
  }),
})

export const evaluatePattern = tool({
  description:
    'Evaluate (play) the current editor code. Triggers audio playback immediately. Use after edit_pattern to hear the result.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => ({
    type: 'strudel_action' as const,
    action: 'evaluate' as const,
  }),
})

export const hush = tool({
  description: 'Stop all audio playback immediately.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => ({
    type: 'strudel_action' as const,
    action: 'hush' as const,
  }),
})

// ============================================================================
// Server-Side Tools (execute on server, DB access)
// ============================================================================

export function createSaveTrackTool(conversationId: string | null) {
  return tool({
    description:
      'Save the current pattern as a named track in the library. Use when the user likes a pattern and wants to keep it.',
    inputSchema: zodSchema(
      z.object({
        title: z.string().describe('Track title'),
        code: z.string().describe('The Strudel code to save'),
        description: z.string().optional().describe('What this track sounds like'),
        tags: z
          .array(z.string())
          .optional()
          .describe('Tags for categorization (e.g. "ambient", "drums", "bass")'),
      })
    ),
    execute: async ({ title, code, description, tags }) => {
      const track = await saveStrudelTrack({
        title,
        code,
        description,
        tags,
        conversation_id: conversationId ?? undefined,
      })
      return {
        type: 'track_saved' as const,
        trackId: track.id,
        title: track.title,
      }
    },
  })
}

export const loadTrack = tool({
  description: 'Load a saved track by ID into the editor.',
  inputSchema: zodSchema(
    z.object({
      trackId: z.string().uuid().describe('Track ID to load'),
    })
  ),
  execute: async ({ trackId }) => {
    const track = await getStrudelTrack(trackId)
    if (!track) return { error: 'Track not found' }
    return {
      type: 'strudel_action' as const,
      action: 'edit_pattern' as const,
      code: track.code,
      description: `Loaded track: ${track.title}`,
    }
  },
})

export const listTracks = tool({
  description: 'List all saved tracks in the library.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const tracks = await listStrudelTracks()
    return {
      tracks: tracks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        tags: t.tags,
        createdAt: t.created_at,
      })),
    }
  },
})

// ============================================================================
// Sampler Integration Tools
// ============================================================================

export const listCollections = tool({
  description:
    'List available sampler collections. Each collection contains sounds that can be loaded into Strudel.',
  inputSchema: zodSchema(z.object({})),
  execute: async () => {
    const { getCollectionsServer } = await import('@/lib/sampler-server')
    const collections = await getCollectionsServer()
    return {
      collections: collections.map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
      })),
    }
  },
})

export const loadCollection = tool({
  description:
    'Load a sampler collection as custom samples. After loading, use the sample names in s() patterns (e.g. s("kick snare")). Returns the available sample names.',
  inputSchema: zodSchema(
    z.object({
      slug: z
        .string()
        .describe('Collection slug (e.g. "juno", "coco", "handpan-sounds")'),
    })
  ),
  execute: async ({ slug }) => {
    const { getCollectionWithPadsServer } = await import(
      '@/lib/sampler-server'
    )
    try {
      const collection = await getCollectionWithPadsServer(slug)
      const sampleMap: Record<string, string[]> = {}

      for (const pad of collection.pads) {
        if (!pad.sound?.audio_url) continue

        const label = pad.label || pad.sound.name || `pad_${pad.row}_${pad.col}`
        const key = label
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')

        if (!sampleMap[key]) sampleMap[key] = []
        sampleMap[key].push(pad.sound.audio_url)
      }

      return {
        type: 'strudel_action' as const,
        action: 'load_samples' as const,
        samples: sampleMap,
        collectionName: collection.name,
        sampleNames: Object.keys(sampleMap),
      }
    } catch {
      return { error: `Collection "${slug}" not found` }
    }
  },
})

// ============================================================================
// Combined tool set (factory — needs conversation context)
// ============================================================================

export function createStrudelTools(conversationId: string | null) {
  return {
    edit_pattern: editPattern,
    evaluate: evaluatePattern,
    hush,
    save_track: createSaveTrackTool(conversationId),
    load_track: loadTrack,
    list_tracks: listTracks,
    list_collections: listCollections,
    load_collection: loadCollection,
  }
}
