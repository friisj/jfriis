/**
 * AI Provider Configuration
 *
 * Unified provider setup for Anthropic, OpenAI, and Google models
 * using Vercel AI SDK
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

// Provider instances - lazy initialized to avoid issues during build
let _anthropic: ReturnType<typeof createAnthropic> | null = null
let _openai: ReturnType<typeof createOpenAI> | null = null
let _google: ReturnType<typeof createGoogleGenerativeAI> | null = null

export function getAnthropic() {
  if (!_anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }
    _anthropic = createAnthropic({ apiKey })
  }
  return _anthropic
}

export function getOpenAI() {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    _openai = createOpenAI({ apiKey })
  }
  return _openai
}

export function getGoogle() {
  if (!_google) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY environment variable is required')
    }
    _google = createGoogleGenerativeAI({ apiKey })
  }
  return _google
}

// Check which providers are available
export function getAvailableProviders(): string[] {
  const available: string[] = []
  if (process.env.ANTHROPIC_API_KEY) available.push('anthropic')
  if (process.env.OPENAI_API_KEY) available.push('openai')
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) available.push('google')
  return available
}
