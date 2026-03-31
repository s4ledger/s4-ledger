import { CDRLRow } from '../types'

/**
 * Sealed Data Vault — stores a snapshot of each row at the time it was sealed.
 * Enables cell-by-cell comparison when a mismatch is detected during verification.
 */

const vault: Record<string, CDRLRow> = {}

/** Store a deep copy of the row at seal time. */
export function storeSealed(rowId: string, row: CDRLRow): void {
  vault[rowId] = JSON.parse(JSON.stringify(row))
}

/** Retrieve the sealed snapshot for a row, or null if never sealed. */
export function getSealed(rowId: string): CDRLRow | null {
  return vault[rowId] ? JSON.parse(JSON.stringify(vault[rowId])) : null
}

/** Compare current row to sealed snapshot. Returns changed fields. */
export function diffRow(
  current: CDRLRow,
  sealed: CDRLRow,
): { field: string; label: string; sealed: string; current: string }[] {
  const fieldLabels: Record<string, string> = {
    id: 'CDRL ID',
    title: 'Title',
    diNumber: 'DI Number',
    contractDueFinish: 'Contract Due/Finish',
    calculatedDueDate: 'Calculated Due Date',
    submittalGuidance: 'Submittal Guidance',
    actualSubmissionDate: 'Actual Submission Date',
    received: 'Received',
    calendarDaysToReview: 'Calendar Days to Review',
    notes: 'Notes',
    status: 'Status',
  }

  const diffs: { field: string; label: string; sealed: string; current: string }[] = []

  for (const key of Object.keys(fieldLabels)) {
    const sVal = String(sealed[key as keyof CDRLRow] ?? '')
    const cVal = String(current[key as keyof CDRLRow] ?? '')
    if (sVal !== cVal) {
      diffs.push({
        field: key,
        label: fieldLabels[key] || key,
        sealed: sVal,
        current: cVal,
      })
    }
  }

  return diffs
}

/** Generate deterministic AI analysis of the mismatch. */
export function analyzeMismatch(
  row: CDRLRow,
  diffs: { field: string; label: string; sealed: string; current: string }[],
): { summary: string; risk: 'Low' | 'Medium' | 'High'; recommendation: string } {
  if (diffs.length === 0) {
    return {
      summary: 'No field-level differences detected. Hash mismatch may be due to serialization changes.',
      risk: 'Low',
      recommendation: 'Re-seal to update the cryptographic hash.',
    }
  }

  const dateFields = ['contractDueFinish', 'calculatedDueDate', 'actualSubmissionDate']
  const criticalFields = ['status', 'received', 'calendarDaysToReview']
  const changedFieldNames = diffs.map(d => d.field)

  const hasCritical = changedFieldNames.some(f => criticalFields.includes(f))
  const hasDateChange = changedFieldNames.some(f => dateFields.includes(f))
  const onlyNotes = diffs.length === 1 && diffs[0].field === 'notes'

  let risk: 'Low' | 'Medium' | 'High' = 'Low'
  let summary: string
  let recommendation: string

  if (hasCritical) {
    risk = 'High'
    const critNames = diffs.filter(d => criticalFields.includes(d.field)).map(d => d.label).join(', ')
    summary = `Critical field(s) modified: ${critNames}. This affects contract compliance status for "${row.title}" (${row.id}).`
    recommendation = 'Immediately verify the change with the Contracting Officer. If authorized, re-seal to restore trust integrity. If unauthorized, escalate to the Program Manager.'
  } else if (hasDateChange) {
    risk = 'Medium'
    const dateNames = diffs.filter(d => dateFields.includes(d.field)).map(d => d.label).join(', ')
    summary = `Schedule-related field(s) modified: ${dateNames}. This may affect milestone tracking and downstream deliverable dependencies.`
    recommendation = 'Confirm the date change is contractually authorized, then re-seal to update the integrity record.'
  } else if (onlyNotes) {
    risk = 'Low'
    summary = `Only the program notes were updated. This is a routine administrative change that does not affect contractual compliance.`
    recommendation = 'Re-seal at your convenience to reflect the updated notes in the integrity record.'
  } else {
    risk = 'Medium'
    const fieldNames = diffs.map(d => d.label).join(', ')
    summary = `${diffs.length} field(s) modified: ${fieldNames}. Review the changes to ensure they align with authorized modifications.`
    recommendation = 'Verify the changes are intentional, then re-seal to update the cryptographic record on XRPL.'
  }

  return { summary, risk, recommendation }
}
