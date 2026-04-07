/**
 * ═══════════════════════════════════════════════════════════════
 *  Rate Limiter — Client-side request throttling
 * ═══════════════════════════════════════════════════════════════
 *
 * Prevents UI from spamming backend APIs (AI, anchor, sync).
 * Uses a sliding window approach: max N requests per window.
 */

interface RateLimiterOptions {
  /** Max requests allowed in the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
}

const limiters = new Map<string, number[]>()

/**
 * Check if a request is allowed under the rate limit.
 * Returns true if allowed, false if throttled.
 */
export function isRateLimited(key: string, opts: RateLimiterOptions): boolean {
  const now = Date.now()
  const timestamps = limiters.get(key) || []

  // Remove expired timestamps outside the window
  const valid = timestamps.filter(t => now - t < opts.windowMs)

  if (valid.length >= opts.maxRequests) {
    limiters.set(key, valid)
    return true // rate limited
  }

  valid.push(now)
  limiters.set(key, valid)
  return false // allowed
}

/**
 * Debounce wrapper — returns a debounced version of the function.
 * Trailing edge only (fires after delay of inactivity).
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delayMs)
  }
}

/* ─── Pre-configured limiters for known endpoints ──────────── */

/** AI chat: max 5 requests per 30 seconds */
export function checkAIChatLimit(): boolean {
  return isRateLimited('ai-chat', { maxRequests: 5, windowMs: 30_000 })
}

/** XRPL anchor: max 10 requests per 60 seconds */
export function checkAnchorLimit(): boolean {
  return isRateLimited('anchor', { maxRequests: 10, windowMs: 60_000 })
}

/** NSERC sync: max 3 requests per 60 seconds */
export function checkSyncLimit(): boolean {
  return isRateLimited('nserc-sync', { maxRequests: 3, windowMs: 60_000 })
}
