import { NextRequest, NextResponse } from 'next/server';
import { getThinkingJobFullServer } from '@/lib/cog-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const job = await getThinkingJobFullServer(id);
    return NextResponse.json(job);
  } catch (error) {
    console.error('Failed to fetch thinking job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch thinking job' },
      { status: 500 }
    );
  }
}
