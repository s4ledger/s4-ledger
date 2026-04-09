/**
 * ═══════════════════════════════════════════════════════════════
 *  Core Utility Tests — hash, rateLimiter
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import { isRateLimited } from '../utils/rateLimiter'

/* ─── Rate Limiter ───────────────────────────────────────────── */

describe('rateLimiter', () => {
  // Each test uses a unique key to avoid cross-test interference

  it('allows requests under the limit', () => {
    const key = 'test-allow-' + Date.now()
    expect(isRateLimited(key, { maxRequests: 3, windowMs: 10000 })).toBe(false)
    expect(isRateLimited(key, { maxRequests: 3, windowMs: 10000 })).toBe(false)
    expect(isRateLimited(key, { maxRequests: 3, windowMs: 10000 })).toBe(false)
  })

  it('blocks requests over the limit', () => {
    const key = 'test-block-' + Date.now()
    const opts = { maxRequests: 2, windowMs: 10000 }
    isRateLimited(key, opts) // 1
    isRateLimited(key, opts) // 2
    expect(isRateLimited(key, opts)).toBe(true) // 3rd = blocked
  })

  it('allows requests after the window expires', async () => {
    const key = 'test-expire-' + Date.now()
    const opts = { maxRequests: 1, windowMs: 50 } // 50ms window
    isRateLimited(key, opts) // 1 — allowed
    expect(isRateLimited(key, opts)).toBe(true) // 2 — blocked

    await new Promise(r => setTimeout(r, 60)) // wait for window to expire
    expect(isRateLimited(key, opts)).toBe(false) // should be allowed again
  })

  it('handles different keys independently', () => {
    const key1 = 'key-a-' + Date.now()
    const key2 = 'key-b-' + Date.now()
    const opts = { maxRequests: 1, windowMs: 10000 }
    isRateLimited(key1, opts)
    expect(isRateLimited(key1, opts)).toBe(true) // key1 blocked
    expect(isRateLimited(key2, opts)).toBe(false) // key2 still allowed
  })
})

/* ─── SHA-256 Hashing ────────────────────────────────────────── */

describe('sha256 + hashRow', () => {
  // In jsdom, crypto.subtle may not be available; we use the
  // Web Crypto API polyfill that vitest/jsdom provides.

  it('sha256 produces a 64-char hex string', async () => {
    // Dynamic import to avoid issues if module uses browser-only APIs at top level
    const { sha256 } = await import('../utils/hash')
    const result = await sha256('hello')
    expect(result).toMatch(/^[a-f0-9]{64}$/)
  })

  it('sha256 is deterministic', async () => {
    const { sha256 } = await import('../utils/hash')
    const a = await sha256('test input')
    const b = await sha256('test input')
    expect(a).toBe(b)
  })

  it('sha256 differs for different inputs', async () => {
    const { sha256 } = await import('../utils/hash')
    const a = await sha256('input1')
    const b = await sha256('input2')
    expect(a).not.toBe(b)
  })

  it('hashRow produces consistent hashes for same data', async () => {
    const { hashRow } = await import('../utils/hash')
    const row = { id: '1', title: 'Test', status: 'green' }
    const a = await hashRow(row)
    const b = await hashRow(row)
    expect(a).toBe(b)
  })

  it('hashRow is key-order independent (canonical sorting)', async () => {
    const { hashRow } = await import('../utils/hash')
    const a = await hashRow({ status: 'green', title: 'Test', id: '1' })
    const b = await hashRow({ id: '1', title: 'Test', status: 'green' })
    expect(a).toBe(b)
  })

  it('hashRow differs when data changes', async () => {
    const { hashRow } = await import('../utils/hash')
    const a = await hashRow({ id: '1', title: 'Test', status: 'green' })
    const b = await hashRow({ id: '1', title: 'Test', status: 'red' })
    expect(a).not.toBe(b)
  })
})
