/**
 * ═══════════════════════════════════════════════════════════════
 *  Hash Utility Tests — sha256, hashRow
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import { sha256, hashRow } from '../utils/hash'

describe('sha256', () => {
  it('returns a 64-character hex string', async () => {
    const hash = await sha256('hello')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces the known SHA-256 of "hello"', async () => {
    const hash = await sha256('hello')
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('produces different hashes for different inputs', async () => {
    const a = await sha256('abc')
    const b = await sha256('xyz')
    expect(a).not.toBe(b)
  })

  it('returns consistent results for the same input', async () => {
    const h1 = await sha256('deterministic')
    const h2 = await sha256('deterministic')
    expect(h1).toBe(h2)
  })

  it('handles empty string', async () => {
    const hash = await sha256('')
    expect(hash).toHaveLength(64)
    // known SHA-256 of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })
})

describe('hashRow', () => {
  it('returns a 64-character hex string for an object', async () => {
    const hash = await hashRow({ name: 'Test', status: 'green' })
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces the same hash regardless of key insertion order', async () => {
    const a = await hashRow({ z: 1, a: 2, m: 3 })
    const b = await hashRow({ a: 2, m: 3, z: 1 })
    expect(a).toBe(b)
  })

  it('produces different hashes for different values', async () => {
    const a = await hashRow({ status: 'green' })
    const b = await hashRow({ status: 'red' })
    expect(a).not.toBe(b)
  })

  it('produces different hashes for different keys', async () => {
    const a = await hashRow({ name: 'X' })
    const b = await hashRow({ title: 'X' })
    expect(a).not.toBe(b)
  })

  it('handles empty object', async () => {
    const hash = await hashRow({})
    expect(hash).toHaveLength(64)
  })
})
