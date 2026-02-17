// Stub: jfriis handles auth middleware at the framework level
// This file exists to prevent import errors from any references
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  return NextResponse.next({ request })
}
