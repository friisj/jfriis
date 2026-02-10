import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const ALLOWED_SLUGS = new Set([
  'attachment-skill',
  'critique',
  'design-current',
  'design-target',
  'feedback',
  'message-attachment-anatomy',
  'prd',
  'principles',
  'ux-map',
])

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  if (!ALLOWED_SLUGS.has(slug)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const filePath = path.join(
    process.cwd(),
    'app',
    '(demo)',
    'demo',
    'adsk',
    'chat-attachments',
    'specs',
    `${slug}.md`
  )

  try {
    const content = await readFile(filePath, 'utf-8')
    return new NextResponse(content, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
