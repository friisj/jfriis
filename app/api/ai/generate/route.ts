/**
 * AI Generation API Route
 *
 * POST /api/ai/generate
 * Executes an AI action and returns the result.
 */

import { NextResponse } from 'next/server'
import { executeAction, getAction } from '@/lib/ai/actions'
import type { FieldGenerationInput } from '@/lib/ai/actions/types'

// Ensure actions are registered
import '@/lib/ai/actions/generate-field'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, input } = body as {
      action: string
      input: FieldGenerationInput
    }

    // Validate action exists
    const actionDef = getAction(action)
    if (!actionDef) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'validation_error',
            message: `Unknown action: ${action}`,
            retryable: false,
          },
        },
        { status: 400 }
      )
    }

    // Execute the action
    const result = await executeAction(action, input)

    if (!result.success) {
      const status = result.error?.code === 'rate_limited' ? 429 : 500
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'provider_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          retryable: true,
        },
      },
      { status: 500 }
    )
  }
}
