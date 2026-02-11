import { NextRequest, NextResponse } from 'next/server';
import { getPipelineJobWithStepsServer } from '@/lib/cog-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = await getPipelineJobWithStepsServer(jobId);
    return NextResponse.json(job);
  } catch (error) {
    console.error('Failed to fetch pipeline job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pipeline job' },
      { status: 500 }
    );
  }
}
