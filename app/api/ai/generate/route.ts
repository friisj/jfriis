/**
 * AI Generation API Route
 *
 * POST /api/ai/generate
 * Executes an AI action and returns the result.
 *
 * Security:
 * - Requires authentication via Supabase session
 * - Rate limited to 10 requests per minute per user
 */

import { NextResponse } from 'next/server'
import { executeAction, getAction } from '@/lib/ai/actions'
import type { FieldGenerationInput } from '@/lib/ai/actions/types'
import { requireAuth } from '@/lib/ai/auth'
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit'

// Ensure actions are registered
import '@/lib/ai/actions/generate-field'
import '@/lib/ai/actions/generate-entity'
import '@/lib/ai/actions/generate-draft'

export async function POST(request: Request) {
  try {
    // 1. Authentication check
    const { user, error: authError } = await requireAuth()

    if (!user || authError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Authentication required',
            retryable: false,
          },
        },
        { status: 401 }
      )
    }

    // 2. Rate limiting check
    const rateLimitResult = await checkAIRateLimit(user.id)

    if (!rateLimitResult.success) {
      const resetIn = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'rate_limited',
            message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
            retryable: true,
            retryAfter: resetIn,
          },
        },
        {
          status: 429,
          headers: getAIRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // 3. Parse and validate request
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
        {
          status: 400,
          headers: getAIRateLimitHeaders(rateLimitResult),
        }
      )
    }

    // 4. Execute the action
    const result = await executeAction(action, input)

    if (!result.success) {
      const status = result.error?.code === 'rate_limited' ? 429 : 500
      return NextResponse.json(result, {
        status,
        headers: getAIRateLimitHeaders(rateLimitResult),
      })
    }

    return NextResponse.json(result, {
      headers: getAIRateLimitHeaders(rateLimitResult),
    })
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
