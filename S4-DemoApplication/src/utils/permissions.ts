import { DRLRow, Organization, UserRole } from '../types'

/* ═══════════════════════════════════════════════════════════════
   Organization-Based Access Tiers
   ═══════════════════════════════════════════════════════════════
   Government — Full access, sees everything
   Contractor — Works for/with Gov't, nearly identical access
   Shipbuilder — Sees their own responsibility clearly. When the
     ball is in the Gov't/Contractor court (submitted but review
     overdue or in-review), the status is masked to a neutral
     "Submitted — Pending Review" so they never see Gov't delays.
   ═══════════════════════════════════════════════════════════════ */

export interface OrgPermissions {
  org: Organization
  /** Can verify / seal records */
  canVerify: boolean
  /** Can run AI Insights */
  canUseAI: boolean
  /** Can generate PDF Reports */
  canGenerateReport: boolean
  /** Report is redacted (gov notes hidden) */
  reportRedacted: boolean
  /** Can see full Audit Trail */
  canViewFullAudit: boolean
  /** Can sync from NSERC IDE */
  canSync: boolean
  /** Sync is read-only (no write-back) */
  syncReadOnly: boolean
  /** Can add / manage craft and hulls */
  canManageCraft: boolean
  /** Can see government internal notes */
  canViewGovNotes: boolean
  /** Can compare against contract */
  canCompareContract: boolean
}

/** Default permissions by organization tier */
const ORG_PERMISSIONS: Record<Organization, OrgPermissions> = {
  Government: {
    org: 'Government',
    canVerify: true,
    canUseAI: true,
    canGenerateReport: true,
    reportRedacted: false,
    canViewFullAudit: true,
    canSync: true,
    syncReadOnly: false,
    canManageCraft: true,
    canViewGovNotes: true,
    canCompareContract: true,
  },
  Contractor: {
    org: 'Contractor',
    canVerify: true,
    canUseAI: true,
    canGenerateReport: true,
    reportRedacted: false,
    canViewFullAudit: true,
    canSync: true,
    syncReadOnly: false,
    canManageCraft: true,
    canViewGovNotes: true,
    canCompareContract: true,
  },
  Shipbuilder: {
    org: 'Shipbuilder',
    canVerify: false,
    canUseAI: true,
    canGenerateReport: true,
    reportRedacted: true,
    canViewFullAudit: false,
    canSync: true,
    syncReadOnly: true,
    canManageCraft: false,
    canViewGovNotes: false,
    canCompareContract: false,
  },
}

/** Role-to-default-organization mapping */
const ROLE_ORG_MAP: Record<UserRole, Organization> = {
  'Program Manager': 'Government',
  'Contracting Officer': 'Government',
  'Quality Assurance': 'Contractor',
  'Logistics Specialist': 'Contractor',
}

/** Get the default organization for a role */
export function getDefaultOrg(role: UserRole): Organization {
  return ROLE_ORG_MAP[role]
}

/** Get permissions for an organization tier */
export function getPermissions(org: Organization): OrgPermissions {
  return ORG_PERMISSIONS[org]
}

/* ─── Shipbuilder Status Masking ──────────────────────────────
   Determines what status the Shipbuilder should see for a DRL.

   Logic:
   - Green (completed) → show green (everyone sees this)
   - Not submitted yet + overdue → show red (Shipbuilder's fault)
   - Not submitted yet + in review/yellow → show yellow (still on
     Shipbuilder to finish, just flagged)
   - Submitted (received=Yes) BUT status is yellow or red →
     the delay is on Gov't/Contractor side. Mask to 'pending'
     so Shipbuilder never sees Gov't is behind.
   ─────────────────────────────────────────────────────────── */

export type MaskedStatus = 'green' | 'yellow' | 'red' | 'pending'

export interface MaskedDRLView {
  /** Display status for this row */
  displayStatus: MaskedStatus
  /** Notes to show (may be redacted) */
  displayNotes: string
  /** Label text for the status */
  statusLabel: string
}

/** Is this DRL "in the Gov't/Contractor court"? i.e., Shipbuilder submitted it */
function isInGovtCourt(row: DRLRow): boolean {
  return row.received === 'Yes' && row.actualSubmissionDate !== ''
}

/** Get the masked view of a DRL for the Shipbuilder */
export function getMaskedView(row: DRLRow, org: Organization): MaskedDRLView {
  // Government and Contractor see everything as-is
  if (org !== 'Shipbuilder') {
    return {
      displayStatus: row.status,
      displayNotes: row.notes,
      statusLabel: row.status === 'green' ? 'Completed' : row.status === 'yellow' ? 'In Review' : 'Overdue',
    }
  }

  // Shipbuilder view
  if (row.status === 'green') {
    return { displayStatus: 'green', displayNotes: row.notes, statusLabel: 'Completed' }
  }

  if (isInGovtCourt(row)) {
    // Shipbuilder submitted it, but Gov't/Contractor side is yellow or red.
    // Mask to neutral "pending" — don't reveal Gov't delays.
    return {
      displayStatus: 'pending',
      displayNotes: 'Submitted — under government review.',
      statusLabel: 'Submitted — Pending Review',
    }
  }

  // Not submitted or not received — this is the Shipbuilder's responsibility
  if (row.status === 'red') {
    return { displayStatus: 'red', displayNotes: row.notes, statusLabel: 'Overdue — Action Required' }
  }

  // Yellow + not yet submitted/received → still on Shipbuilder
  return { displayStatus: 'yellow', displayNotes: row.notes, statusLabel: 'In Progress' }
}
