import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const supabase = await createClient()

  try {
    const { data, error } = await (supabase as any)
      .from('cog_images')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Failed to fetch group images:', error)
    return NextResponse.json({ error: 'Failed to fetch group images' }, { status: 500 })
  }
}
