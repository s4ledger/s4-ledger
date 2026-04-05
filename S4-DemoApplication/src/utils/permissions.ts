import { DRLRow, Organization, UserRole, ColumnKey } from '../types'

/* ═══════════════════════════════════════════════════════════════
   Interoperable Multi-Spreadsheet Permissions
   ═══════════════════════════════════════════════════════════════
   Three distinct spreadsheets — one shared database.

   Government  — Full picture. Sees every column, every note,
                 every status. Can configure Contractor access.
   Contractor  — Nearly full access. Gov't can grant/revoke
                 specific columns via the Permissions Modal.
   Shipbuilder — Their own purpose-built spreadsheet. Can view
                 and edit their fields. Cannot see Gov't internal
                 notes or Gov't-side delays. Status is masked so
                 yellow/red only appear when it's THEIR issue.

   Four-Status System:
     Green   — Good. No action needed.
     Yellow  — Compliance issue (non-compliance, prior comments
               not addressed, open RIDs, contract issues).
     Red     — Overdue. Not submitted by the responsible party.
     Pending — Under review or coming due in next 30 days.
               (blue/grey in UI)

   All edits from any org write to the shared database and are
   visible in other org spreadsheets per their permission scope.
   NSERC IDE sync is another data input into the same database.
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
  'Shipbuilder Representative': 'Shipbuilder',
}

/** Get the default organization for a role */
export function getDefaultOrg(role: UserRole): Organization {
  return ROLE_ORG_MAP[role]
}

/** Get permissions for an organization tier */
export function getPermissions(org: Organization): OrgPermissions {
  return ORG_PERMISSIONS[org]
}

/* ─── Status Display for Each Organization ────────────────────
   Determines what status each org sees for a DRL based on
   who is responsible for the current action.

   Four statuses:
     green   — Completed / accepted, no action needed
     yellow  — Compliance issue (non-compliance, comments not
               addressed, open RIDs, contract issues)
     red     — Overdue — not submitted by responsible party
     pending — Under review or coming due in 30 days (blue/grey)

   Masking rules for Shipbuilder:
   - Green → green (everyone sees this)
   - Pending → pending (neutral — under review or coming due)
   - Yellow where Shipbuilder is responsible → yellow (fix it)
   - Yellow where Gov't/Contractor is responsible → pending
     (Shipbuilder doesn't see Gov't compliance issues)
   - Red where Shipbuilder is responsible → red (their fault)
   - Red where Gov't/Contractor is responsible → pending
     (mask Gov't delays)
   ─────────────────────────────────────────────────────────── */

export type MaskedStatus = 'green' | 'yellow' | 'red' | 'pending'

export interface MaskedDRLView {
  /** Display status for this row */
  displayStatus: MaskedStatus
  /** Notes to show (may be redacted for Shipbuilder) */
  displayNotes: string
  /** Label text for the status */
  statusLabel: string
}

/**
 * Determine if the responsibility for this DRL is on the Gov't/Contractor side.
 * True when:
 * - Shipbuilder submitted it (received=Yes) and it's in review
 * - OR the responsibleParty field explicitly says Government/Contractor
 */
function isInGovtCourt(row: DRLRow): boolean {
  // Explicit responsible party field takes priority
  if (row.responsibleParty === 'Government' || row.responsibleParty === 'Contractor') {
    return true
  }
  // If submitted and received, ball is in Gov't court for review
  return row.received === 'Yes' && row.actualSubmissionDate !== ''
}

/** Get the masked view of a DRL for the given org */
export function getMaskedView(row: DRLRow, org: Organization): MaskedDRLView {
  // Government and Contractor see everything as-is
  if (org !== 'Shipbuilder') {
    const labelMap: Record<string, string> = {
      green: 'Completed',
      yellow: 'Compliance Issue',
      red: 'Overdue',
      pending: 'Pending Review',
    }
    return {
      displayStatus: row.status,
      displayNotes: row.notes,
      statusLabel: labelMap[row.status] || row.status,
    }
  }

  // ── Shipbuilder view ──

  // Green is always green
  if (row.status === 'green') {
    return { displayStatus: 'green', displayNotes: row.notes, statusLabel: 'Completed' }
  }

  // Pending is always pending (under review or coming due)
  if (row.status === 'pending') {
    return { displayStatus: 'pending', displayNotes: row.shipbuilderNotes || 'Under review — no action required.', statusLabel: 'Pending Review' }
  }

  // Yellow — compliance issue
  if (row.status === 'yellow') {
    if (isInGovtCourt(row)) {
      // Gov't/Contractor has the compliance issue — mask from Shipbuilder
      return {
        displayStatus: 'pending',
        displayNotes: row.shipbuilderNotes || 'Submitted — under review.',
        statusLabel: 'Submitted — Pending Review',
      }
    }
    // Shipbuilder's compliance issue — they need to see it
    return { displayStatus: 'yellow', displayNotes: row.shipbuilderNotes || row.notes, statusLabel: 'Compliance Issue — Action Required' }
  }

  // Red — overdue
  if (row.status === 'red') {
    if (isInGovtCourt(row)) {
      // Gov't is behind — mask from Shipbuilder
      return {
        displayStatus: 'pending',
        displayNotes: row.shipbuilderNotes || 'Submitted — under government review.',
        statusLabel: 'Submitted — Pending Review',
      }
    }
    // Shipbuilder is behind — show red
    return { displayStatus: 'red', displayNotes: row.shipbuilderNotes || row.notes, statusLabel: 'Overdue — Action Required' }
  }

  // Fallback
  return { displayStatus: row.status, displayNotes: row.notes, statusLabel: row.status }
}

/* ─── Contractor Permission Grants ────────────────────────────
   Government can dynamically grant Contractor access to
   additional columns beyond their base spreadsheet.
   ─────────────────────────────────────────────────────────── */

export interface ContractorGrants {
  /** Additional columns Gov't has granted to Contractor */
  grantedColumns: Set<ColumnKey>
}

/** Default Contractor grants (Gov't starts with these active) */
export function getDefaultContractorGrants(): ContractorGrants {
  return {
    grantedColumns: new Set<ColumnKey>(),
  }
}
