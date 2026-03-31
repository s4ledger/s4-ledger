import { CDRLRow } from '../types'
import { contractRequirements, ContractRequirement } from '../data/contractData'

export interface ComparisonResult {
  rowId: string
  status: 'green' | 'yellow' | 'red'
  remarks: string
  findings: string[]
  contractRef: string
}

export interface ComparisonSummary {
  compliant: number
  needsAttention: number
  critical: number
  total: number
  results: ComparisonResult[]
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function compareRow(row: CDRLRow, req: ContractRequirement): ComparisonResult {
  const findings: string[] = []
  let severity: 'green' | 'yellow' | 'red' = 'green'

  // 1. Check if submitted at all
  if (!row.actualSubmissionDate) {
    findings.push(
      `CRITICAL: ${req.requiredVersion} version not submitted. Per ${req.contractRef}, due ${req.contractDue}. ` +
      `Action: Submit ${req.requiredVersion} ${req.requiredRevision} via ${req.submittalMethod} immediately.`
    )
    severity = 'red'
  } else {
    // 2. Check timeliness
    const daysLate = daysBetween(req.contractDue, row.actualSubmissionDate)
    if (daysLate > 0) {
      if (daysLate > 7) {
        findings.push(
          `Submitted ${daysLate} calendar days late (${row.actualSubmissionDate} vs. contract due ${req.contractDue}). ` +
          `Per ${req.block}, this exceeds the 7-day grace period. Contractual delinquency applies.`
        )
        severity = 'red'
      } else {
        findings.push(
          `Submitted ${daysLate} calendar days after contract due date (${row.actualSubmissionDate} vs. ${req.contractDue}). ` +
          `Within grace period but noted. Per ${req.block}.`
        )
        if (severity === 'green') severity = 'yellow'
      }
    }

    // 3. Check calculated due vs contract requirement calculated due
    if (req.calculatedDue !== row.calculatedDueDate) {
      findings.push(
        `Calculated due date mismatch: tracker shows ${row.calculatedDueDate}, contract requires ${req.calculatedDue} per ${req.submittalRule}.`
      )
      if (severity === 'green') severity = 'yellow'
    }
  }

  // 4. Check version/revision in title
  if (req.requiredRevision !== 'Current') {
    if (!row.title.toLowerCase().includes(req.requiredRevision.toLowerCase())) {
      findings.push(
        `Required revision ${req.requiredRevision} not indicated in deliverable title. ` +
        `Per ${req.contractRef}, the ${req.requiredVersion} ${req.requiredRevision} is the contractually required version.`
      )
      if (severity === 'green') severity = 'yellow'
    }
  }

  // 5. Check prior comments requirement
  if (req.priorCommentsRequired) {
    const rev = req.requiredRevision
    const prevRev = rev.replace(/Rev ([B-Z])/, (_, letter) => {
      return `Rev ${String.fromCharCode(letter.charCodeAt(0) - 1)}`
    })
    if (row.notes && (
      row.notes.toLowerCase().includes('comment') ||
      row.notes.toLowerCase().includes('rid')
    )) {
      findings.push(
        `Prior ${prevRev} comments must be fully addressed before ${rev} acceptance. ` +
        `Per ${req.block}, unresolved comments from previous revision must be dispositioned and incorporated.`
      )
      if (severity === 'green') severity = 'yellow'
    }
  }

  // 6. Check hull requirements
  if (req.hullRequirement) {
    findings.push(
      `Hull requirement: ${req.hullRequirement}. ` +
      `Verify compliance per ${req.block}. Government review will check hull-specific content.`
    )
    if (row.actualSubmissionDate && severity === 'green') {
      // Only flag as yellow if not already worse
    }
  }

  // 7. Check submittal method
  if (req.submittalMethod === 'IDE + Hard Copy') {
    findings.push(
      `Dual submittal required: IDE electronic submission AND hard copy per ${req.block}. ` +
      `Verify both submission channels are confirmed.`
    )
  }

  // 8. Check government review period
  if (row.calendarDaysToReview !== null && row.calendarDaysToReview > req.govReviewDays) {
    findings.push(
      `Government review has exceeded the ${req.govReviewDays}-day contractual review period ` +
      `(currently ${row.calendarDaysToReview} days). Per ${req.contractRef}, government action required ` +
      `to disposition or extend review timeline.`
    )
    if (severity === 'green') severity = 'yellow'
  }

  // 9. Check receipt
  if (row.received === 'No' && row.actualSubmissionDate) {
    findings.push(
      `Submission recorded but receipt not confirmed. ` +
      `Per ${req.block}, government must acknowledge receipt within 5 business days.`
    )
    if (severity === 'green') severity = 'yellow'
  }

  // 10. Completeness criteria check
  if (row.actualSubmissionDate && severity !== 'red') {
    const missingCount = Math.floor(Math.random() * 2) // Simulate 0-1 missing for demo
    if (missingCount > 0 && req.completenessCriteria.length > 0) {
      const missing = req.completenessCriteria[req.completenessCriteria.length - 1]
      findings.push(
        `Completeness: Verify "${missing}" is included per DID ${req.diNumber}. ` +
        `Incomplete deliverables will be returned without action.`
      )
    }
  }

  // If fully green and submitted, add positive note
  if (severity === 'green' && row.actualSubmissionDate) {
    findings.push(
      `Fully compliant with ${req.contractRef}. ` +
      `${req.requiredVersion} ${req.requiredRevision} received via ${req.submittalMethod} and within review timeline.`
    )
  }

  // Build corrective action for non-green
  let corrective = ''
  if (severity === 'red' && !row.actualSubmissionDate) {
    const urgentDate = addDays(new Date().toISOString().slice(0, 10), 5)
    corrective = ` Corrective action: Submit ${req.requiredVersion} ${req.requiredRevision} via ${req.submittalMethod} NLT ${urgentDate}.`
  } else if (severity === 'yellow') {
    corrective = ` Recommended: Resolve open items within ${req.govReviewDays} calendar days per ${req.block}.`
  }

  const remarks = findings.join(' ') + corrective

  return {
    rowId: row.id,
    status: severity,
    remarks,
    findings,
    contractRef: req.summaryRule,
  }
}

/**
 * Simulate AI-powered contractual comparison with typewriter delay per row.
 */
export async function runContractComparison(
  data: CDRLRow[],
  onRowComplete?: (result: ComparisonResult, index: number) => void,
): Promise<ComparisonSummary> {
  const results: ComparisonResult[] = []

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const req = contractRequirements[row.id]

    // Simulate AI processing delay per row
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400))

    if (req) {
      const result = compareRow(row, req)
      results.push(result)
      onRowComplete?.(result, i)
    } else {
      const fallback: ComparisonResult = {
        rowId: row.id,
        status: 'yellow',
        remarks: `No Attachment J-2 requirement found for ${row.id}. Manual review recommended.`,
        findings: ['No matching contract requirement in Attachment J-2.'],
        contractRef: 'Not mapped',
      }
      results.push(fallback)
      onRowComplete?.(fallback, i)
    }
  }

  return {
    compliant: results.filter(r => r.status === 'green').length,
    needsAttention: results.filter(r => r.status === 'yellow').length,
    critical: results.filter(r => r.status === 'red').length,
    total: results.length,
    results,
  }
}
