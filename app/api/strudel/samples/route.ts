import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/ai/auth'
import {
  getCollectionsServer,
  getCollectionWithPadsServer,
} from '@/lib/sampler-server'
import type { PadWithSound } from '@/lib/types/sampler'

/**
 * GET /api/strudel/samples?collection=slug
 *
 * Returns a Strudel-compatible sample map from a sampler collection.
 * Without ?collection, returns the list of available collections.
 *
 * Sample map format: { "kick": ["url.mp3"], "snare": ["url.mp3"], ... }
 */
export async function GET(request: Request) {
  const { user, error } = await requireAuth()
  if (!user) return NextResponse.json({ error }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const collectionSlug = searchParams.get('collection')

  if (!collectionSlug) {
    const collections = await getCollectionsServer()
    return NextResponse.json({
      collections: collections.map((c) => ({
        slug: c.slug,
        name: c.name,
        description: c.description,
      })),
    })
  }

  try {
    const collection = await getCollectionWithPadsServer(collectionSlug)

    // Build Strudel sample map: label → [audio_url]
    // Only include pads that have a sound with an audio URL
    const sampleMap: Record<string, string[]> = {}

    for (const pad of collection.pads as PadWithSound[]) {
      if (!pad.sound?.audio_url) continue

      // Use pad label, fall back to sound name, sanitize for Strudel
      const key = (pad.label || pad.sound.name || `pad_${pad.row}_${pad.col}`)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')

      if (!sampleMap[key]) {
        sampleMap[key] = []
      }
      sampleMap[key].push(pad.sound.audio_url)
    }

    return NextResponse.json({
      collection: collectionSlug,
      name: collection.name,
      samples: sampleMap,
      count: Object.keys(sampleMap).length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Collection "${collectionSlug}" not found` },
      { status: 404 }
    )
  }
}
