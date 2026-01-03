/**
 * AI Generation Rate Limiting
 *
 * More generous limits than MCP (AI calls are expensive and slower).
 * Uses Vercel KV (Upstash Redis) for distributed rate limiting.
 * Degrades gracefully if KV is not configured.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

// 10 AI generations per minute per user (more generous than MCP)
const RATE_LIMIT_REQUESTS = 10
const RATE_LIMIT_WINDOW = '1 m'

// Create rate limiter (will be null if KV not configured)
let ratelimit: Ratelimit | null = null

function getRateLimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit

  // Check if KV is configured
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn('[ai:rate-limit] Vercel KV not configured, rate limiting disabled')
    return null
  }

  try {
    ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW),
      analytics: true,
      prefix: 'ai:ratelimit',
    })
    return ratelimit
  } catch (error) {
    console.error('[ai:rate-limit] Failed to initialize rate limiter:', error)
    return null
  }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // timestamp when limit resets
  limit: number
}

/**
 * Check rate limit for a user.
 * Returns success=true if KV is not configured (graceful degradation).
 */
export async function checkAIRateLimit(userId: string): Promise<RateLimitResult> {
  const limiter = getRateLimiter()

  // Graceful degradation: allow all requests if KV not configured
  if (!limiter) {
    return {
      success: true,
      remaining: -1, // -1 indicates rate limiting disabled
      reset: 0,
      limit: RATE_LIMIT_REQUESTS,
    }
  }

  try {
    const result = await limiter.limit(userId)
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: RATE_LIMIT_REQUESTS,
    }
  } catch (error) {
    console.error('[ai:rate-limit] Error checking rate limit:', error)
    // On error, allow the request (fail open for better UX)
    return {
      success: true,
      remaining: -1,
      reset: 0,
      limit: RATE_LIMIT_REQUESTS,
    }
  }
}

/**
 * Get rate limit headers for response.
 */
export function getAIRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  if (result.remaining === -1) {
    return {} // No headers if rate limiting disabled
  }

  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  }
}
