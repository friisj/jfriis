/**
 * AI Test Endpoint
 *
 * Tests basic functionality of all configured AI providers.
 * GET /api/ai/test - Returns status of each provider
 * POST /api/ai/test - Tests generation with a specific model
 */

import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getAvailableProviders, getModel, models } from '@/lib/ai'

export async function GET() {
  const availableProviders = getAvailableProviders()

  return NextResponse.json({
    status: 'ok',
    availableProviders,
    models: Object.entries(models).map(([key, config]) => ({
      key,
      name: config.name,
      provider: config.provider,
      available: availableProviders.includes(config.provider),
    })),
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { model = 'claude-haiku', prompt = 'Say hello in exactly 5 words.' } = body

    if (!models[model]) {
      return NextResponse.json(
        { error: `Unknown model: ${model}. Available: ${Object.keys(models).join(', ')}` },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await generateText({
      model: getModel(model) as any,
      prompt,
      maxOutputTokens: 100,
      temperature: 0.7,
    })
    const duration = Date.now() - startTime

    return NextResponse.json({
      model,
      modelId: models[model].id,
      provider: models[model].provider,
      prompt,
      response: result.text,
      usage: result.usage,
      durationMs: duration,
    })
  } catch (error) {
    console.error('AI test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
