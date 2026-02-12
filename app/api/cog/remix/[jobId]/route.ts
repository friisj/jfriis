import { NextRequest, NextResponse } from 'next/server';
import { getRemixJobFullServer } from '@/lib/cog-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await getRemixJobFullServer(jobId);
    return NextResponse.json(job);
  } catch (error) {
    console.error('Failed to fetch remix job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch remix job' },
      { status: 500 }
    );
  }
}
