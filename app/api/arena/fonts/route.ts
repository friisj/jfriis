import { NextResponse } from 'next/server'
import path from 'path'
import { scanFontsDirectory, systemFonts } from '@/lib/fonts/font-scanner'

export async function GET() {
  try {
    const fontsPath = path.join(process.cwd(), 'public', 'fonts', 'arena')
    const customFonts = await scanFontsDirectory(fontsPath, '/fonts/arena')

    return NextResponse.json({
      customFonts,
      systemFonts
    })
  } catch (error) {
    console.error('Error fetching arena fonts:', error)
    return NextResponse.json({ customFonts: [], systemFonts }, { status: 500 })
  }
}
