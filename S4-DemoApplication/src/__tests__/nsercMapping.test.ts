/**
 * ═══════════════════════════════════════════════════════════════
 *  NSERC IDE Mapping Tests — mapNSERCDataToTrackerRow
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import {
  mapNSERCDataToTrackerRow,
  type NSERCSharePointItem,
} from '../services/nsercIdeService'

/* ─── Helper ─────────────────────────────────────────────────── */

function makeItem(overrides: Partial<NSERCSharePointItem['fields']> = {}): NSERCSharePointItem {
  return {
    id: 'sp-001',
    fields: {
      DRL_ID: 'DRL-001',
      Title: 'Test Report',
      DI_Number: 'DI-MISC-80711',
      Contract_Due: '2026-06-01',
      Calc_Due_Date: '2026-05-15',
      Submittal_Guide: 'Submit quarterly per CDRL A001',
      Actual_Sub_Date: '2026-05-10',
      Received: 'Yes',
      Cal_Days_Review: 30,
      Notes: 'Under review',
      Status: 'Yellow',
      Revision: null,
      Comments: null,
      Craft: null,
      Platform: null,
      Attachment_J2_Ref: null,
      Program: 'PMS 300',
      ...overrides,
    },
  }
}

/* ─── mapNSERCDataToTrackerRow ───────────────────────────────── */

describe('mapNSERCDataToTrackerRow', () => {
  it('maps basic fields correctly', () => {
    const row = mapNSERCDataToTrackerRow(makeItem())
    expect(row.id).toBe('DRL-001')
    expect(row.title).toBe('Test Report')
    expect(row.diNumber).toBe('DI-MISC-80711')
    expect(row.contractDueFinish).toBe('2026-06-01')
    expect(row.calculatedDueDate).toBe('2026-05-15')
    expect(row.submittalGuidance).toBe('Submit quarterly per CDRL A001')
    expect(row.actualSubmissionDate).toBe('2026-05-10')
    expect(row.received).toBe('Yes')
    expect(row.calendarDaysToReview).toBe(30)
    expect(row.status).toBe('yellow')
  })

  it('lowercases status', () => {
    expect(mapNSERCDataToTrackerRow(makeItem({ Status: 'Green' })).status).toBe('green')
    expect(mapNSERCDataToTrackerRow(makeItem({ Status: 'Red' })).status).toBe('red')
  })

  it('appends Revision suffix to title when present', () => {
    const row = mapNSERCDataToTrackerRow(makeItem({ Revision: 'Rev C' }))
    expect(row.title).toContain('(Rev C)')
  })

  it('appends Craft tag to title when present', () => {
    const row = mapNSERCDataToTrackerRow(makeItem({ Craft: 'Hull 3' }))
    expect(row.title).toContain('(Hull 3)')
  })

  it('includes both Revision and Craft in title', () => {
    const row = mapNSERCDataToTrackerRow(makeItem({ Revision: 'Rev B', Craft: 'Hull 1' }))
    expect(row.title).toContain('(Rev B)')
    expect(row.title).toContain('(Hull 1)')
  })

  it('includes Attachment J-2 reference in notes', () => {
    const row = mapNSERCDataToTrackerRow(makeItem({ Attachment_J2_Ref: 'CDRL A003' }))
    expect(row.notes).toContain('Attachment J-2')
    expect(row.notes).toContain('CDRL A003')
  })

  it('includes Comments in notes', () => {
    const row = mapNSERCDataToTrackerRow(makeItem({ Comments: 'Pending clarification' }))
    expect(row.notes).toContain('PMS 300 Comment')
    expect(row.notes).toContain('Pending clarification')
  })

  it('handles null Actual_Sub_Date gracefully', () => {
    const row = mapNSERCDataToTrackerRow(makeItem({ Actual_Sub_Date: null }))
    expect(row.actualSubmissionDate).toBe('')
  })

  it('handles null Cal_Days_Review', () => {
    const row = mapNSERCDataToTrackerRow(makeItem({ Cal_Days_Review: null }))
    expect(row.calendarDaysToReview).toBeNull()
  })
})
