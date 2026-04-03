import { DRLRow } from '../types'
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

function compareRow(row: DRLRow, req: ContractRequirement): ComparisonResult {
  const findings: string[] = []
  let severity: 'green' | 'yellow' | 'red' = 'green'

  // 1. Check if submitted at all
  if (!row.actualSubmissionDate) {
    findings.push(
      `DELINQUENT: ${req.requiredVersion} ${req.requiredRevision} not received. ` +
      `Per DD Form 1423, ${req.block}, contractor shall submit ${req.requiredVersion} version ` +
      `NLT ${req.contractDue} (${req.submittalRule}). ` +
      `Deliverable is past due. Ref: ${req.contractRef}.`
    )
    severity = 'red'
  } else {
    // 2. Check timeliness
    const daysLate = daysBetween(req.contractDue, row.actualSubmissionDate)
    if (daysLate > 0) {
      if (daysLate > 7) {
        findings.push(
          `LATE SUBMITTAL: Received ${row.actualSubmissionDate}, ${daysLate} calendar days after ` +
          `contractual due date of ${req.contractDue}. Per ${req.block}, the required delivery was ` +
          `"${req.submittalRule}." This exceeds the allowable variance and constitutes a ` +
          `DD Form 1423 Block 14 delinquency. DCMA notification may apply.`
        )
        severity = 'red'
      } else {
        findings.push(
          `MINOR VARIANCE: Submitted ${row.actualSubmissionDate}, ${daysLate} day(s) after contract ` +
          `due of ${req.contractDue}. Per ${req.block}, deliverable was due per "${req.submittalRule}." ` +
          `Variance within administrative tolerance but noted for the record.`
        )
        if (severity === 'green') severity = 'yellow'
      }
    }

    // 3. Check calculated due vs contract requirement calculated due
    if (req.calculatedDue !== row.calculatedDueDate) {
      findings.push(
        `DUE DATE DISCREPANCY: Tracker calculated due date (${row.calculatedDueDate}) does not match ` +
        `contract-derived date (${req.calculatedDue}) computed per "${req.submittalRule}." ` +
        `Verify Block 13 timing against current program schedule baseline.`
      )
      if (severity === 'green') severity = 'yellow'
    }
  }

  // 4. Check version/revision in title
  if (req.requiredRevision !== 'Current') {
    if (!row.title.toLowerCase().includes(req.requiredRevision.toLowerCase())) {
      findings.push(
        `REVISION DISCREPANCY: ${req.requiredVersion} ${req.requiredRevision} required per ` +
        `DD Form 1423 Block 4 and ${req.contractRef}. Current submission title does not ` +
        `indicate ${req.requiredRevision}. Verify correct revision was submitted per DID ${req.diNumber}.`
      )
      if (severity === 'green') severity = 'yellow'
    }
  }

  // 5. Check prior comments requirement
  if (req.priorCommentsRequired) {
    const rev = req.requiredRevision
    const prevRev = rev.replace(/Rev ([B-Z])/, (_, letter: string) => {
      return `Rev ${String.fromCharCode(letter.charCodeAt(0) - 1)}`
    })
    // Always flag this for revisions that require prior comment disposition
    findings.push(
      `COMMENT DISPOSITION REQUIRED: Per ${req.block}, prior ${prevRev} government comments ` +
      `must be fully dispositioned and incorporated before ${rev} can be accepted. ` +
      `Contractor shall provide comment disposition matrix (CDM) with response to each ` +
      `government RID/comment. Unresolved items will result in disapproval per DFARS 252.246.`
    )
    if (row.notes && (
      row.notes.toLowerCase().includes('comment') ||
      row.notes.toLowerCase().includes('rid')
    )) {
      if (severity === 'green') severity = 'yellow'
    }
  }

  // 6. Check hull requirements
  if (req.hullRequirement) {
    findings.push(
      `HULL-SPECIFIC REQUIREMENT: Per ${req.block}, ${req.hullRequirement}. ` +
      `Government review per DD Form 1423 Block 16 will verify hull-specific content is ` +
      `separately identified and traceable per the Ship Work Breakdown Structure (SWBS). ` +
      `Missing hull data will be returned without action per NAVSEA standing instruction.`
    )
  }

  // 7. Check submittal method
  if (req.submittalMethod === 'IDE + Hard Copy') {
    findings.push(
      `DUAL SUBMITTAL: Per DD Form 1423 Block 15, submission requires BOTH electronic ` +
      `delivery via IDE/eDocs AND one (1) hard copy to the designated Government representative. ` +
      `Confirm IDE upload receipt AND hard copy transmittal letter on file.`
    )
  } else if (req.submittalMethod === 'IDE') {
    findings.push(
      `SUBMITTAL METHOD: Delivery via IDE (Interactive Data Environment) per DD Form 1423 Block 15. ` +
      `Verify contractor uploaded to correct contract folder with proper metadata tags.`
    )
  } else if (req.submittalMethod === 'Electronic (EDMS)') {
    findings.push(
      `SUBMITTAL METHOD: Electronic delivery via EDMS per DD Form 1423 Block 15. ` +
      `Verify document registered in EDMS with correct document number and revision indicator.`
    )
  }

  // 8. Check government review period
  if (row.calendarDaysToReview !== null && row.calendarDaysToReview > req.govReviewDays) {
    findings.push(
      `GOV'T REVIEW EXCEEDANCE: Review period has reached ${row.calendarDaysToReview} calendar days ` +
      `against the ${req.govReviewDays}-day review cycle specified in DD Form 1423 Block 16. ` +
      `Per ${req.contractRef}, Government shall complete review within ${req.govReviewDays} days ` +
      `of receipt. COR/ACOR action required to disposition or formally extend review timeline.`
    )
    if (severity === 'green') severity = 'yellow'
  }

  // 9. Check receipt
  if (row.received === 'No' && row.actualSubmissionDate) {
    findings.push(
      `RECEIPT NOT CONFIRMED: Contractor reports submission on ${row.actualSubmissionDate} but ` +
      `Government receipt not acknowledged. Per DFARS 252.242-7006, COR shall acknowledge ` +
      `receipt within five (5) business days of delivery. Verify IDE/EDMS upload status.`
    )
    if (severity === 'green') severity = 'yellow'
  }

  // 10. Completeness criteria check — deterministic per row
  if (row.actualSubmissionDate && severity !== 'red') {
    // Use last criterion as the one to flag for verification
    if (req.completenessCriteria.length > 0) {
      const criterionToVerify = req.completenessCriteria[req.completenessCriteria.length - 1]
      findings.push(
        `COMPLETENESS CHECK: Per DID ${req.diNumber}, verify the following element is included: ` +
        `"${criterionToVerify}." Incomplete deliverables per DD Form 1423 Block 12 ` +
        `criteria will be returned without action (DFARS 252.242-7004).`
      )
    }
  }

  // If fully green and submitted, add positive note
  if (severity === 'green' && row.actualSubmissionDate) {
    findings.unshift(
      `COMPLIANT: ${req.requiredVersion} ${req.requiredRevision} received via ${req.submittalMethod} ` +
      `on ${row.actualSubmissionDate}, within contractual timeline. ` +
      `Deliverable accepted per DD Form 1423 and ${req.contractRef}. No corrective action required.`
    )
  }

  // Build corrective action for non-green
  if (severity === 'red' && !row.actualSubmissionDate) {
    const urgentDate = addDays(new Date().toISOString().slice(0, 10), 5)
    findings.push(
      `CORRECTIVE ACTION REQUIRED: Contractor shall submit ${req.requiredVersion} ${req.requiredRevision} ` +
      `via ${req.submittalMethod} NLT ${urgentDate}. Failure to deliver may result in ` +
      `issuance of Cure Notice per FAR 52.249-8. PCO/ACO coordination recommended.`
    )
  } else if (severity === 'yellow') {
    findings.push(
      `RECOMMENDED ACTION: Resolve noted discrepancies within ${req.govReviewDays} calendar days ` +
      `per ${req.block}. Contractor to provide updated status at next DRL status meeting.`
    )
  }

  // Short remarks for the table cell (first finding, truncated)
  const shortRemark = severity === 'green'
    ? 'Compliant — no action required.'
    : severity === 'red'
    ? `Delinquent per ${req.block}. See details.`
    : `Open items per ${req.block}. See details.`

  return {
    rowId: row.id,
    status: severity,
    remarks: shortRemark,
    findings,
    contractRef: req.summaryRule,
  }
}

/**
 * Simulate AI-powered contractual comparison with typewriter delay per row.
 */
export async function runContractComparison(
  data: DRLRow[],
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
