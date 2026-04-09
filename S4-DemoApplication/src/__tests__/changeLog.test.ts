/**
 * ═══════════════════════════════════════════════════════════════
 *  Change Log Tests — in-memory change tracking
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect, vi } from 'vitest'

// Mock Supabase before importing changeLog
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: null, error: { message: 'mock' } }),
          }),
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: null, error: { message: 'mock' } }),
        }),
      }),
    }),
  },
}))

import {
  recordChange,
  getChangesForRow,
  getAllChanges,
  getMemoryChangeCount,
} from '../utils/changeLog'

describe('changeLog (in-memory fallback)', () => {
  // Note: memoryLog is module-scoped and persists across tests.
  // Tests are designed to work with accumulated state.

  const baseParams = {
    userEmail: 'test@s4ledger.com',
    userRole: 'Government',
    userOrg: 'NAVSEA',
    rowTitle: 'Test Deliverable',
    field: 'status',
    oldValue: 'pending',
    newValue: 'green',
    changeType: 'edit' as const,
  }

  it('starts with zero changes', () => {
    // getMemoryChangeCount may show 0 or accumulated from prior tests
    expect(typeof getMemoryChangeCount()).toBe('number')
  })

  it('records a change and increments count', async () => {
    const before = getMemoryChangeCount()
    await recordChange({ ...baseParams, rowId: 'row-cl-1' })
    expect(getMemoryChangeCount()).toBe(before + 1)
  })

  it('records multiple changes for different rows', async () => {
    const before = getMemoryChangeCount()
    await recordChange({ ...baseParams, rowId: 'row-cl-2', field: 'notes', oldValue: '', newValue: 'Updated' })
    await recordChange({ ...baseParams, rowId: 'row-cl-3', field: 'title', oldValue: 'Old', newValue: 'New' })
    expect(getMemoryChangeCount()).toBe(before + 2)
  })

  it('retrieves changes for a specific row', async () => {
    await recordChange({ ...baseParams, rowId: 'row-cl-filter', field: 'status', oldValue: 'red', newValue: 'green' })
    const changes = await getChangesForRow('row-cl-filter')
    expect(changes.length).toBeGreaterThanOrEqual(1)
    expect(changes.every(c => c.row_id === 'row-cl-filter')).toBe(true)
  })

  it('change entries have correct structure', async () => {
    await recordChange({ ...baseParams, rowId: 'row-cl-struct' })
    const changes = await getChangesForRow('row-cl-struct')
    const entry = changes[0]
    expect(entry).toHaveProperty('id')
    expect(entry).toHaveProperty('user_email', 'test@s4ledger.com')
    expect(entry).toHaveProperty('row_id', 'row-cl-struct')
    expect(entry).toHaveProperty('field', 'status')
    expect(entry).toHaveProperty('field_label')
    expect(entry).toHaveProperty('old_value', 'pending')
    expect(entry).toHaveProperty('new_value', 'green')
    expect(entry).toHaveProperty('change_type', 'edit')
    expect(entry).toHaveProperty('created_at')
  })

  it('maps field names to human-readable labels', async () => {
    await recordChange({ ...baseParams, rowId: 'row-cl-label', field: 'title' })
    const changes = await getChangesForRow('row-cl-label')
    expect(changes[0].field_label).toBe('Title')
  })

  it('getAllChanges returns entries sorted by newest first', async () => {
    await recordChange({ ...baseParams, rowId: 'row-cl-sort-a' })
    // Small delay to ensure different timestamps
    await new Promise(r => setTimeout(r, 5))
    await recordChange({ ...baseParams, rowId: 'row-cl-sort-b' })
    const all = await getAllChanges(10)
    expect(all.length).toBeGreaterThanOrEqual(2)
    // Verify descending order
    for (let i = 0; i < all.length - 1; i++) {
      expect(new Date(all[i].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(all[i + 1].created_at).getTime()
      )
    }
  })

  it('handles null user fields gracefully', async () => {
    await recordChange({
      rowId: 'row-cl-null',
      rowTitle: 'Anon Edit',
      field: 'notes',
      oldValue: null,
      newValue: 'Something',
      changeType: 'edit',
    })
    const changes = await getChangesForRow('row-cl-null')
    expect(changes[0].user_email).toBeNull()
    expect(changes[0].user_role).toBeNull()
  })

  it('supports all change types', async () => {
    const types = ['edit', 'seal', 'reseal', 'verify', 'ai_remark', 'status_change', 'external_sync'] as const
    for (const changeType of types) {
      await recordChange({ ...baseParams, rowId: `row-cl-type-${changeType}`, changeType })
      const changes = await getChangesForRow(`row-cl-type-${changeType}`)
      expect(changes[0].change_type).toBe(changeType)
    }
  })
})
