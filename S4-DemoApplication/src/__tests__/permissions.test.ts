/**
 * ═══════════════════════════════════════════════════════════════
 *  Permissions Tests — status masking, role→org, org permissions
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import {
  getDefaultOrg,
  getPermissions,
  getMaskedView,
  getDefaultContractorGrants,
} from '../utils/permissions'
import type { DRLRow } from '../types'

/* ─── Helper to build a partial DRLRow for testing ───────────── */

function makeRow(overrides: Partial<DRLRow> = {}): DRLRow {
  return {
    id: 'TEST-001',
    title: 'Test Deliverable',
    diNumber: 'DI-TEST-001',
    contractDueFinish: '2026-06-01',
    calculatedDueDate: '2026-06-01',
    submittalGuidance: '',
    actualSubmissionDate: '',
    received: 'No',
    calendarDaysToReview: null,
    notes: 'Internal notes here',
    status: 'pending',
    shipbuilderNotes: 'SB notes',
    govNotes: 'Gov internal notes',
    ...overrides,
  }
}

/* ─── Role → Org Mapping ─────────────────────────────────────── */

describe('getDefaultOrg', () => {
  it('maps Program Manager to Government', () => {
    expect(getDefaultOrg('Program Manager')).toBe('Government')
  })

  it('maps Contracting Officer to Government', () => {
    expect(getDefaultOrg('Contracting Officer')).toBe('Government')
  })

  it('maps Quality Assurance to Contractor', () => {
    expect(getDefaultOrg('Quality Assurance')).toBe('Contractor')
  })

  it('maps Logistics Specialist to Contractor', () => {
    expect(getDefaultOrg('Logistics Specialist')).toBe('Contractor')
  })

  it('maps Shipbuilder Representative to Shipbuilder', () => {
    expect(getDefaultOrg('Shipbuilder Representative')).toBe('Shipbuilder')
  })
})

/* ─── Org Permissions ────────────────────────────────────────── */

describe('getPermissions', () => {
  it('Government has full access', () => {
    const perms = getPermissions('Government')
    expect(perms.canVerify).toBe(true)
    expect(perms.canViewGovNotes).toBe(true)
    expect(perms.canViewFullAudit).toBe(true)
    expect(perms.reportRedacted).toBe(false)
    expect(perms.syncReadOnly).toBe(false)
  })

  it('Shipbuilder has restricted access', () => {
    const perms = getPermissions('Shipbuilder')
    expect(perms.canVerify).toBe(false)
    expect(perms.canViewGovNotes).toBe(false)
    expect(perms.canViewFullAudit).toBe(false)
    expect(perms.reportRedacted).toBe(true)
    expect(perms.syncReadOnly).toBe(true)
    expect(perms.canManageCraft).toBe(false)
  })

  it('Contractor has near-full access', () => {
    const perms = getPermissions('Contractor')
    expect(perms.canVerify).toBe(true)
    expect(perms.canViewGovNotes).toBe(true)
    expect(perms.canViewFullAudit).toBe(true)
  })
})

/* ─── Status Masking (getMaskedView) ─────────────────────────── */

describe('getMaskedView', () => {
  it('Government sees true status for all rows', () => {
    const redRow = makeRow({ status: 'red' })
    const view = getMaskedView(redRow, 'Government')
    expect(view.displayStatus).toBe('red')
    expect(view.displayNotes).toBe('Internal notes here')
  })

  it('Contractor sees true status for all rows', () => {
    const yellowRow = makeRow({ status: 'yellow' })
    const view = getMaskedView(yellowRow, 'Contractor')
    expect(view.displayStatus).toBe('yellow')
  })

  it('Shipbuilder sees green as green', () => {
    const greenRow = makeRow({ status: 'green' })
    const view = getMaskedView(greenRow, 'Shipbuilder')
    expect(view.displayStatus).toBe('green')
    expect(view.statusLabel).toBe('Completed')
  })

  it('Shipbuilder sees pending as pending', () => {
    const pendingRow = makeRow({ status: 'pending' })
    const view = getMaskedView(pendingRow, 'Shipbuilder')
    expect(view.displayStatus).toBe('pending')
  })

  it('Shipbuilder sees yellow masked to pending when Gov is responsible', () => {
    // Submitted + received → Gov's court → mask yellow to pending
    const row = makeRow({
      status: 'yellow',
      actualSubmissionDate: '2026-05-01',
      received: 'Yes',
      responsibleParty: 'Government',
    })
    const view = getMaskedView(row, 'Shipbuilder')
    expect(view.displayStatus).toBe('pending')
    expect(view.statusLabel).toContain('Pending')
  })

  it('Shipbuilder sees yellow when they are responsible', () => {
    const row = makeRow({
      status: 'yellow',
      responsibleParty: 'Shipbuilder',
      received: 'No',
    })
    const view = getMaskedView(row, 'Shipbuilder')
    expect(view.displayStatus).toBe('yellow')
    expect(view.statusLabel).toContain('Action Required')
  })

  it('Shipbuilder sees red masked to pending when Gov is responsible', () => {
    const row = makeRow({
      status: 'red',
      actualSubmissionDate: '2026-05-01',
      received: 'Yes',
      responsibleParty: 'Government',
    })
    const view = getMaskedView(row, 'Shipbuilder')
    expect(view.displayStatus).toBe('pending')
  })

  it('Shipbuilder sees red when they are responsible', () => {
    const row = makeRow({
      status: 'red',
      responsibleParty: 'Shipbuilder',
      received: 'No',
    })
    const view = getMaskedView(row, 'Shipbuilder')
    expect(view.displayStatus).toBe('red')
    expect(view.statusLabel).toContain('Overdue')
  })
})

/* ─── Contractor Grants ──────────────────────────────────────── */

describe('getDefaultContractorGrants', () => {
  it('initializes with empty grant set', () => {
    const grants = getDefaultContractorGrants()
    expect(grants.grantedColumns.size).toBe(0)
  })
})
