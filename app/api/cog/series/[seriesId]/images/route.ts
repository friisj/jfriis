import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params
  const supabase = await createClient()

  try {
    const { data, error } = await (supabase as any)
      .from('cog_images')
      .select('*')
      .eq('series_id', seriesId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Failed to fetch series images:', error)
    return NextResponse.json({ error: 'Failed to fetch series images' }, { status: 500 })
  }
}
