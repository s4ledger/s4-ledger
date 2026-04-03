import { Organization, UserRole } from '../types'

/* ═══════════════════════════════════════════════════════════════
   Organization-Based Access Tiers (Option B)
   ═══════════════════════════════════════════════════════════════
   Controls what each organization tier can see and do.
   Government sees everything. Shipbuilder sees own program data
   with restricted gov notes. Subcontractor sees assigned DRLs only.
   ═══════════════════════════════════════════════════════════════ */

export interface OrgPermissions {
  /** Organization tier */
  org: Organization
  /** Can view all DRL rows (false = assigned DRLs only) */
  viewAllRows: boolean
  /** Which DRL fields are editable */
  editableFields: readonly string[]
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
  /** Can see government review notes */
  canViewGovNotes: boolean
  /** Can see contractor internal notes */
  canViewContractorNotes: boolean
  /** Can compare against contract */
  canCompareContract: boolean
}

/** Default permissions by organization tier */
const ORG_PERMISSIONS: Record<Organization, OrgPermissions> = {
  Government: {
    org: 'Government',
    viewAllRows: true,
    editableFields: ['notes', 'status', 'actualSubmissionDate', 'received', 'calendarDaysToReview', 'submittalGuidance', 'contractDueFinish', 'calculatedDueDate'],
    canVerify: true,
    canUseAI: true,
    canGenerateReport: true,
    reportRedacted: false,
    canViewFullAudit: true,
    canSync: true,
    syncReadOnly: false,
    canManageCraft: true,
    canViewGovNotes: true,
    canViewContractorNotes: true,
    canCompareContract: true,
  },
  Shipbuilder: {
    org: 'Shipbuilder',
    viewAllRows: true,
    editableFields: ['notes', 'actualSubmissionDate', 'received'],
    canVerify: false,
    canUseAI: true,
    canGenerateReport: true,
    reportRedacted: true,
    canViewFullAudit: false,
    canSync: true,
    syncReadOnly: true,
    canManageCraft: false,
    canViewGovNotes: false,
    canViewContractorNotes: true,
    canCompareContract: false,
  },
  Subcontractor: {
    org: 'Subcontractor',
    viewAllRows: false,
    editableFields: ['notes'],
    canVerify: false,
    canUseAI: false,
    canGenerateReport: false,
    reportRedacted: true,
    canViewFullAudit: false,
    canSync: false,
    syncReadOnly: true,
    canManageCraft: false,
    canViewGovNotes: false,
    canViewContractorNotes: false,
    canCompareContract: false,
  },
}

/** Role-to-default-organization mapping */
const ROLE_ORG_MAP: Record<UserRole, Organization> = {
  'Program Manager': 'Government',
  'Contracting Officer': 'Government',
  'Quality Assurance': 'Government',
  'Logistics Specialist': 'Shipbuilder',
}

/** Get the default organization for a role */
export function getDefaultOrg(role: UserRole): Organization {
  return ROLE_ORG_MAP[role]
}

/** Get permissions for an organization tier */
export function getPermissions(org: Organization): OrgPermissions {
  return ORG_PERMISSIONS[org]
}

/** Get permissions for a role (via its default org mapping) */
export function getPermissionsForRole(role: UserRole): OrgPermissions {
  return ORG_PERMISSIONS[ROLE_ORG_MAP[role]]
}

/** Check if a specific field is editable for the given org */
export function canEditField(org: Organization, field: string): boolean {
  return ORG_PERMISSIONS[org].editableFields.includes(field)
}
