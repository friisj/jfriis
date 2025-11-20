import { NextResponse } from 'next/server'
import path from 'path'
import { scanFontsDirectory, systemFonts } from '@/lib/fonts/font-scanner'

export async function GET() {
  try {
    const fontsPath = path.join(process.cwd(), 'public', 'fonts')
    const customFonts = await scanFontsDirectory(fontsPath)

    return NextResponse.json({
      customFonts,
      systemFonts
    })
  } catch (error) {
    console.error('Error fetching fonts:', error)
    return NextResponse.json({ customFonts: [], systemFonts }, { status: 500 })
  }
}
