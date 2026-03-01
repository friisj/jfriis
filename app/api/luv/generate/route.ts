import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Image generation not yet implemented' },
    { status: 501 }
  );
}
