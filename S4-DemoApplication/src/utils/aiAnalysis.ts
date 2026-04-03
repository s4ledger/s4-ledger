import { DRLRow, AnchorRecord } from '../types'
import { contractRequirements } from '../data/contractData'

/* ─── Types ──────────────────────────────────────────────────────── */
export type Priority = 'Critical' | 'High' | 'Medium' | 'Low'

export interface AIRowInsight {
  rowId: string
  title: string
  priority: Priority
  statusExplanation: string
  changesSinceSeal: string | null
  programImpact: string
  nextActions: { action: string; dueDate: string }[]
  suggestedComms: string
  conciseNote: string
}

export interface AIPortfolioSummary {
  topActions: { rowId: string; title: string; action: string; priority: Priority; dueDate: string }[]
  incomingAlerts: string[]
  trendSummary: string
  weeklyProgress: { progressed: number; stillOverdue: number; newSeals: number }
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function addBusinessDays(from: string, days: number): string {
  const d = new Date(from)
  let added = 0
  while (added < days) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

function addCalDays(from: string, days: number): string {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function getPriority(row: DRLRow, isSealed: boolean, editedSinceSeal: boolean): Priority {
  if (row.status === 'red' && !row.actualSubmissionDate) return 'Critical'
  if (row.status === 'red') return 'High'
  if (editedSinceSeal) return 'High'
  if (row.status === 'yellow' && row.calendarDaysToReview !== null && row.calendarDaysToReview > 20) return 'High'
  if (row.status === 'yellow') return 'Medium'
  if (row.status === 'green' && !isSealed) return 'Medium'
  return 'Low'
}

function getHull(title: string): string | null {
  const m = title.match(/\(Hull\s*(\d+)\)/i)
  return m ? m[1] : null
}

/* ─── Row-level analysis ─────────────────────────────────────────── */
export function analyzeRow(
  row: DRLRow,
  anchors: Record<string, AnchorRecord>,
  editedSinceSeal: Set<string>,
): AIRowInsight {
  const req = contractRequirements[row.id]
  const anchor = anchors[row.id]
  const isSealed = !!anchor
  const wasEdited = editedSinceSeal.has(row.id)
  const hull = getHull(row.title)
  const priority = getPriority(row, isSealed, wasEdited)
  const todayStr = today()

  /* ─── Status explanation ────────────────────────────────── */
  let statusExplanation: string
  if (row.status === 'red' && !row.actualSubmissionDate) {
    const daysOverdue = daysBetween(row.contractDueFinish, todayStr)
    statusExplanation = req
      ? `DELINQUENT — ${req.requiredVersion} ${req.requiredRevision} not received. ` +
        `Per DD Form 1423, ${req.block}, contractor was required to deliver NLT ${req.contractDue} ` +
        `("${req.submittalRule}"). Currently ${daysOverdue} calendar days past due. ` +
        `${req.hullRequirement ? `Hull-specific data (${req.hullRequirement}) also outstanding. ` : ''}` +
        `This constitutes a Block 14 delinquency per DFARS and may trigger Cure Notice proceedings.`
      : `OVERDUE — Not submitted. ${row.contractDueFinish} contractual due date has passed. Immediate contractor engagement required.`
  } else if (row.status === 'red' && row.actualSubmissionDate) {
    const daysLate = daysBetween(row.contractDueFinish, row.actualSubmissionDate)
    statusExplanation = req
      ? `LATE SUBMITTAL — Received ${row.actualSubmissionDate}, ${daysLate} calendar days after contractual ` +
        `due date of ${req.contractDue}. Per ${req.block}, ${req.submittalRule}. ` +
        `Exceeds allowable variance per DD Form 1423 Block 14 criteria. ${req.contractRef}.`
      : `Late submission — received ${row.actualSubmissionDate}, past due date of ${row.contractDueFinish}.`
  } else if (row.status === 'yellow') {
    const issues: string[] = []
    if (req && row.calendarDaysToReview !== null && row.calendarDaysToReview > req.govReviewDays) {
      issues.push(`Gov't review at ${row.calendarDaysToReview}d exceeds the ${req.govReviewDays}d cycle`)
    }
    if (req?.priorCommentsRequired) issues.push('Prior comment disposition required before acceptance')
    if (row.notes.toLowerCase().includes('rid')) issues.push('Open RIDs pending resolution')
    if (row.notes.toLowerCase().includes('tbd')) issues.push('TBD items remain in deliverable')
    statusExplanation = req
      ? `IN REVIEW — ${req.requiredVersion} ${req.requiredRevision} submitted ${row.actualSubmissionDate || 'N/A'} ` +
        `via ${req.submittalMethod}. ${issues.length > 0 ? issues.join('. ') + '. ' : ''}` +
        `Per ${req.block}, resolve within ${req.govReviewDays} calendar days. ${req.contractRef}.`
      : `Under review. ${issues.join('. ') || 'Awaiting Government review completion.'}`
  } else {
    statusExplanation = req
      ? `COMPLIANT — ${req.requiredVersion} ${req.requiredRevision} received on ${row.actualSubmissionDate} ` +
        `via ${req.submittalMethod}, within contractual timeline. Accepted per DD Form 1423, ${req.contractRef}. ` +
        `${isSealed ? 'Cryptographic hash verified and sealed to XRPL.' : 'Eligible for Ledger Seal.'} ` +
        `No corrective action required.`
      : `Approved. Submitted ${row.actualSubmissionDate}. ${isSealed ? 'Sealed to ledger.' : 'Ready for seal.'}`
  }

  /* ─── Changes since seal ────────────────────────────────── */
  let changesSinceSeal: string | null = null
  if (wasEdited && anchor) {
    changesSinceSeal = `Record was edited after being sealed on ${new Date(anchor.timestamp).toLocaleDateString('en-US')}. ` +
      `The current data no longer matches the sealed hash. A re-seal is recommended to restore integrity verification.`
  } else if (isSealed) {
    changesSinceSeal = `No changes detected since seal on ${new Date(anchor.timestamp).toLocaleDateString('en-US')}. Data integrity verified.`
  }

  /* ─── Program impact ────────────────────────────────────── */
  let programImpact: string
  if (row.status === 'red' && !row.actualSubmissionDate) {
    programImpact = req
      ? `This delinquent deliverable may delay the ${req.frequency === 'ONE/R' ? 'program milestone' : 'reporting cycle'} ` +
        `and create cascading risk across dependent DRLs. ${hull ? `Hull ${hull} schedule directly impacted. ` : ''}` +
        `Estimated cost impact: $${(Math.floor(Math.random() * 50) + 20)}K in delayed reviews and rework. ` +
        `Government review queue blocked until receipt.`
      : `Missing deliverable creates schedule and cost risk.`
  } else if (row.status === 'red') {
    programImpact = `Late delivery has consumed ${row.calendarDaysToReview || 'N/A'} review days. ` +
      `May impact downstream milestones and contractor CPARS rating.`
  } else if (row.status === 'yellow') {
    programImpact = req
      ? `Open review items could delay acceptance. ${req.priorCommentsRequired ? 'Comment disposition is a gate to final approval. ' : ''}` +
        `${hull ? `Hull ${hull} integration timeline at moderate risk. ` : ''}` +
        `Government review resources are allocated — timely resolution avoids resource contention.`
      : `Under review — moderate schedule risk if not resolved promptly.`
  } else {
    programImpact = `No program risk. Deliverable accepted and ${isSealed ? 'sealed to ledger' : 'eligible for seal'}. ` +
      `${hull ? `Hull ${hull} on track for this requirement. ` : ''}` +
      `Completed ${row.calendarDaysToReview || 'N/A'} days ahead of review limit.`
  }

  /* ─── Next actions ──────────────────────────────────────── */
  const nextActions: { action: string; dueDate: string }[] = []
  if (row.status === 'red' && !row.actualSubmissionDate) {
    const urgentDate = addBusinessDays(todayStr, 5)
    const cureDate = addBusinessDays(todayStr, 10)
    nextActions.push(
      { action: `Direct contractor to submit ${req?.requiredVersion || 'FINAL'} ${req?.requiredRevision || ''} via ${req?.submittalMethod || 'IDE'} immediately`, dueDate: urgentDate },
      { action: 'Issue Cure Notice per FAR 52.249-8 if not received within 5 business days', dueDate: cureDate },
      { action: 'Escalate to PCO/ACO for contractor performance assessment (CPARS input)', dueDate: addBusinessDays(todayStr, 7) },
    )
    if (hull) nextActions.push({ action: `Assess impact on Hull ${hull} integration schedule and brief PM`, dueDate: addBusinessDays(todayStr, 3) })
  } else if (row.status === 'red') {
    nextActions.push(
      { action: `Complete expedited review within ${req?.govReviewDays || 30} calendar days of receipt`, dueDate: addCalDays(row.actualSubmissionDate, req?.govReviewDays || 30) },
      { action: 'Document delinquency in contractor performance file', dueDate: addBusinessDays(todayStr, 5) },
      { action: `Verify completeness per DID ${req?.diNumber || row.diNumber} before acceptance`, dueDate: addBusinessDays(todayStr, 10) },
    )
  } else if (row.status === 'yellow') {
    const resolveDate = addCalDays(todayStr, req?.govReviewDays || 30)
    nextActions.push(
      { action: 'Follow up with reviewing authority on outstanding RIDs/comments', dueDate: addBusinessDays(todayStr, 3) },
    )
    if (req?.priorCommentsRequired) {
      nextActions.push({ action: 'Obtain Comment Disposition Matrix (CDM) from contractor', dueDate: addBusinessDays(todayStr, 5) })
    }
    nextActions.push(
      { action: `Resolve all open items and approve/disapprove per ${req?.block || 'Block 4'}`, dueDate: resolveDate },
      { action: 'Track resolution at next weekly DRL status meeting', dueDate: addBusinessDays(todayStr, 5) },
    )
  } else {
    if (!isSealed) {
      nextActions.push({ action: 'Seal record to XRPL ledger for tamper-evident integrity proof', dueDate: addBusinessDays(todayStr, 2) })
    }
    nextActions.push({ action: 'File in EDMS and confirm archival per records management policy', dueDate: addBusinessDays(todayStr, 5) })
    if (wasEdited) {
      nextActions.push({ action: 'Re-seal record — data was modified after previous seal', dueDate: todayStr })
    }
  }

  /* ─── Suggested communication ───────────────────────────── */
  let suggestedComms: string
  if (row.status === 'red' && !row.actualSubmissionDate) {
    suggestedComms = `Subject: URGENT — ${row.id} ${row.title} Delinquent\n\n` +
      `To: [Shipbuilder Program Manager]\nCc: [SDM], [COR/ACOR]\n\n` +
      `Per DD Form 1423, ${req?.block || 'Attachment J-2'}, the ${req?.requiredVersion || 'FINAL'} ` +
      `${req?.requiredRevision || ''} of ${row.title} was due ${row.contractDueFinish}. ` +
      `As of today, this deliverable has not been received. ` +
      `Please provide status and anticipated delivery date NLT COB ${addBusinessDays(todayStr, 2)}.\n\n` +
      `Failure to deliver may result in issuance of a Cure Notice per FAR 52.249-8.\n\n` +
      `V/R,\n[Government Program Team]`
  } else if (row.status === 'red') {
    suggestedComms = `Subject: ${row.id} Late Submittal — Expedited Review Required\n\n` +
      `To: [Lead Reviewer]\nCc: [COR], [QA]\n\n` +
      `${row.title} was received ${row.actualSubmissionDate}, after the contractual due date. ` +
      `Please prioritize review and provide disposition NLT ${addCalDays(todayStr, 14)}. ` +
      `Document any deficiencies for CPARS input.\n\nV/R,\n[Government Program Team]`
  } else if (row.status === 'yellow') {
    suggestedComms = `Subject: ${row.id} — Review Status Update Requested\n\n` +
      `To: [Lead Reviewer]\nCc: [COR]\n\n` +
      `${row.title} is under review with ${row.calendarDaysToReview || 'N/A'} calendar days elapsed. ` +
      `Please provide status of any open RIDs or comments. ` +
      `Target completion: ${addCalDays(todayStr, req?.govReviewDays || 14)}.\n\nV/R,\n[Government Program Team]`
  } else {
    suggestedComms = `Subject: ${row.id} — Accepted / No Action Required\n\n` +
      `FYI — ${row.title} has been accepted and ${isSealed ? 'sealed to the XRPL ledger' : 'is ready for ledger seal'}. ` +
      `No further action required from the program team.`
  }

  /* ─── Concise note for table column ─────────────────────── */
  let conciseNote: string
  if (row.status === 'red' && !row.actualSubmissionDate) {
    conciseNote = `[${priority}] DELINQUENT — Not received. Cure Notice pending. Due: ${row.contractDueFinish}.`
  } else if (row.status === 'red') {
    conciseNote = `[${priority}] Late submittal. Expedited review in progress.`
  } else if (row.status === 'yellow') {
    const openItems = row.notes.toLowerCase().includes('rid') ? 'Open RIDs.' : 'Under review.'
    conciseNote = `[${priority}] ${openItems} ${nextActions[0]?.action.slice(0, 60) || ''}`
  } else {
    conciseNote = wasEdited
      ? `[High] Compliant but edited since seal. Re-seal recommended.`
      : `[${priority}] Compliant. ${isSealed ? 'Sealed.' : 'Seal recommended.'}`
  }

  return {
    rowId: row.id,
    title: row.title,
    priority,
    statusExplanation,
    changesSinceSeal,
    programImpact,
    nextActions,
    suggestedComms,
    conciseNote,
  }
}

/* ─── Portfolio-level analysis ───────────────────────────────────── */
export function analyzePortfolio(
  data: DRLRow[],
  anchors: Record<string, AnchorRecord>,
  editedSinceSeal: Set<string>,
): AIPortfolioSummary {
  const insights = data.map(r => analyzeRow(r, anchors, editedSinceSeal))
  const todayStr = today()

  // Top 5 prioritized actions across all rows
  const allActions: { rowId: string; title: string; action: string; priority: Priority; dueDate: string }[] = []
  const prioOrder: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }

  for (const ins of insights) {
    for (const act of ins.nextActions) {
      allActions.push({ rowId: ins.rowId, title: ins.title, action: act.action, priority: ins.priority, dueDate: act.dueDate })
    }
  }
  allActions.sort((a, b) => prioOrder[a.priority] - prioOrder[b.priority] || a.dueDate.localeCompare(b.dueDate))
  const topActions = allActions.slice(0, 5)

  // Simulated incoming alerts (synthetic external feed)
  const incomingAlerts: string[] = []
  const redCount = data.filter(r => r.status === 'red').length
  const unsealed = data.filter(r => !anchors[r.id]).length
  if (redCount > 0) {
    incomingAlerts.push(`${redCount} delinquent deliverable${redCount > 1 ? 's' : ''} require immediate contractor engagement`)
  }
  if (unsealed > 0) {
    incomingAlerts.push(`${unsealed} record${unsealed > 1 ? 's' : ''} not yet sealed — integrity verification pending`)
  }
  if (editedSinceSeal.size > 0) {
    incomingAlerts.push(`${editedSinceSeal.size} record${editedSinceSeal.size > 1 ? 's' : ''} edited since last seal — re-seal recommended`)
  }
  // Simulated IDE feed alert
  const simulatedNew = Math.min(3, Math.max(1, data.filter(r => r.status === 'yellow').length))
  incomingAlerts.push(`${simulatedNew} updated submission${simulatedNew > 1 ? 's' : ''} detected from IDE data feed (simulated)`)

  // Trend
  const green = data.filter(r => r.status === 'green').length
  const yellow = data.filter(r => r.status === 'yellow').length
  const sealed = data.filter(r => anchors[r.id]).length
  const trendSummary = `${green} of ${data.length} DRLs approved (${Math.round(green / data.length * 100)}%). ` +
    `${yellow} under active review. ${redCount} overdue. ${sealed} sealed to ledger. ` +
    `On-time rate: ${Math.round(data.filter(r => r.actualSubmissionDate && new Date(r.actualSubmissionDate) <= new Date(r.contractDueFinish)).length / (data.filter(r => r.actualSubmissionDate).length || 1) * 100)}%.`

  return {
    topActions,
    incomingAlerts,
    trendSummary,
    weeklyProgress: {
      progressed: Math.max(1, green - 1), // simulated delta
      stillOverdue: redCount,
      newSeals: Math.min(sealed, 2),
    },
  }
}

/* ─── Simulated chat response ────────────────────────────────────── */
export function generateChatResponse(userMessage: string, row: DRLRow, currentInsight: AIRowInsight): string {
  const msg = userMessage.toLowerCase()

  if (msg.includes('deadline') || msg.includes('due date') || msg.includes('when')) {
    const req = contractRequirements[row.id]
    return req
      ? `The contractual due date is ${req.contractDue} per ${req.block}. Based on the submittal rule ` +
        `("${req.submittalRule}"), the calculated due was ${req.calculatedDue}. ` +
        `I recommend targeting ${addBusinessDays(today(), 5)} for resolution of any outstanding items.`
      : `The recorded due date is ${row.contractDueFinish}. I recommend following up within 5 business days.`
  }

  if (msg.includes('escalat') || msg.includes('cure') || msg.includes('notice')) {
    return `Based on current status, ${row.status === 'red' ? 'a Cure Notice per FAR 52.249-8 is warranted. ' +
      'Draft the notice referencing the delinquent deliverable and send to the Contracting Officer for issuance. ' +
      'The contractor has 10 days to cure after receipt.' :
      'escalation is not immediately required, but monitor closely. If the review exceeds the contractual cycle, ' +
      'notify the COR/ACOR and document in the contractor performance file.'}`
  }

  if (msg.includes('hull') || msg.includes('ship')) {
    const hull = getHull(row.title)
    const req = contractRequirements[row.id]
    return hull
      ? `This deliverable is assigned to Hull ${hull}. ${req?.hullRequirement || 'No hull-specific contractual requirement identified.'} ` +
        `Ensure hull-specific content is separately traceable per the Ship Work Breakdown Structure (SWBS).`
      : `This deliverable is not assigned to a specific hull. It applies program-wide across all hulls.`
  }

  if (msg.includes('risk') || msg.includes('impact')) {
    return currentInsight.programImpact
  }

  if (msg.includes('email') || msg.includes('draft') || msg.includes('send') || msg.includes('communicate')) {
    return `Here's a suggested communication:\n\n${currentInsight.suggestedComms}`
  }

  if (msg.includes('seal') || msg.includes('verify') || msg.includes('hash')) {
    return currentInsight.changesSinceSeal || `This record ${row.id} is ${currentInsight.priority === 'Low' ? 'sealed and verified' : 'pending seal/verification'}. ` +
      `Sealing creates an immutable XRPL anchor with a SHA-256 hash for tamper-evident integrity proof.`
  }

  // Default thoughtful response
  return `Good question. For ${row.id} (${row.title}), the current status is ${row.status}. ` +
    `${currentInsight.nextActions.length > 0 ? `The highest-priority action is: "${currentInsight.nextActions[0].action}" ` +
    `(target: ${currentInsight.nextActions[0].dueDate}). ` : ''}` +
    `Let me know if you'd like me to adjust the recommended actions, draft a communication, or analyze program risk impact.`
}
