import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { CogImage, CogImageWithGroupInfo } from '@/lib/types/cog'

export async function GET(request: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params
  const supabase = await createClient()

  try {
    // Get all images for the series
    const { data: allImages, error } = await (supabase as any)
      .from('cog_images')
      .select('*')
      .eq('series_id', seriesId)

    if (error) {
      throw error
    }

    if (!allImages || allImages.length === 0) {
      return NextResponse.json([])
    }

    // Build map of group primaries (one representative per group)
    // This matches the grid view behavior
    const groupCountMap = new Map<string, number>()
    const groupPrimaryMap = new Map<string, CogImage>()

    for (const img of allImages) {
      const groupId = img.group_id || img.id

      // Count images per group
      const count = groupCountMap.get(groupId) || 0
      groupCountMap.set(groupId, count + 1)

      // Track group primaries (id === group_id, or standalone images)
      const isGroupPrimary = img.id === groupId || (!img.group_id && !img.parent_image_id)
      if (isGroupPrimary && !groupPrimaryMap.has(groupId)) {
        groupPrimaryMap.set(groupId, img)
      }
    }

    // Build list of representative images (one per group)
    const representatives: CogImageWithGroupInfo[] = []

    for (const [groupId, primaryImage] of groupPrimaryMap) {
      representatives.push({
        ...primaryImage,
        group_count: groupCountMap.get(groupId) || 1,
      })
    }

    // Sort by creation date (newest first) to match grid order
    representatives.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json(representatives)
  } catch (error) {
    console.error('Failed to fetch series images:', error)
    return NextResponse.json({ error: 'Failed to fetch series images' }, { status: 500 })
  }
}
