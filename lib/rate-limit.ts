/**
 * Simple in-memory rate limiter
 * For production with multiple instances, consider using Redis-based rate limiting
 * like @upstash/ratelimit or similar
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  private cleanup() {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetAt < now) {
        delete this.store[key]
      }
    })
  }

  /**
   * Check if request should be rate limited
   * @param identifier - Unique identifier for the requester (IP, user ID, etc.)
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Object with success status and remaining requests
   */
  async check(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60000
  ): Promise<{
    success: boolean
    remaining: number
    resetAt: number
  }> {
    const now = Date.now()
    const entry = this.store[identifier]

    // No entry or expired - create new
    if (!entry || entry.resetAt < now) {
      this.store[identifier] = {
        count: 1,
        resetAt: now + windowMs,
      }
      return {
        success: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
      }
    }

    // Increment count
    entry.count++

    // Check if limit exceeded
    if (entry.count > limit) {
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      }
    }

    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string) {
    delete this.store[identifier]
  }

  /**
   * Destroy the rate limiter and clean up
   */
  destroy() {
    clearInterval(this.cleanupInterval)
    this.store = {}
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter()

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfig = {
  // Authentication endpoints - strict limits
  auth: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // API endpoints - moderate limits
  api: {
    limit: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Public API - stricter limits
  publicApi: {
    limit: 30,
    windowMs: 60 * 1000, // 1 minute
  },
}

/**
 * Helper to get client identifier from request
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (works with proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp
  }
  
  // Fallback to connection remote address
  return 'anonymous'
}

/**
 * Middleware helper for rate limiting
 */
export async function checkRateLimit(
  request: Request,
  config: { limit: number; windowMs: number } = rateLimitConfig.api
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const identifier = getClientIdentifier(request)
  const result = await rateLimiter.check(identifier, config.limit, config.windowMs)
  
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.resetAt,
  }
}
