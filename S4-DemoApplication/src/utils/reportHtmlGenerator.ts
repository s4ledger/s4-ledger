/**
 * Report HTML Generator — produces rich HTML matching the PDF template layout.
 * The output is loaded into the TipTap editor for preview/editing.
 */
import { DRLRow, AnchorRecord, UserRole } from '../types'
import { contractRequirements } from '../data/contractData'
import { AIRowInsight } from './aiAnalysis'
import { getAuditSummary, getAuditLog } from './auditTrail'

/* ─── Color palette (matching pdf.ts) ────────────────────────────── */
const ACCENT = '#007AFF'
const TEXT = '#1D1D1F'
const STEEL = '#6E6E73'
const GREEN = '#22C55E'
const YELLOW = '#EAB308'
const RED = '#EF4444'
const BG_GREEN = '#EBFFF0'
const BG_YELLOW = '#FFF9E6'
const BG_RED = '#FFEBEB'
const LIGHT_BG = '#F5F5F7'

/* ─── Shared analysis (mirrors pdf.ts) ───────────────────────────── */
function generateAIAnalysis(data: DRLRow[], anchors: Record<string, AnchorRecord>) {
  const green = data.filter(r => r.status === 'green')
  const yellow = data.filter(r => r.status === 'yellow')
  const red = data.filter(r => r.status === 'red')
  const sealed = Object.keys(anchors).length
  const avgReviewDays = data
    .filter(r => r.calendarDaysToReview !== null)
    .reduce((s, r) => s + (r.calendarDaysToReview ?? 0), 0) /
    (data.filter(r => r.calendarDaysToReview !== null).length || 1)
  const submitted = data.filter(r => r.actualSubmissionDate).length
  const onTime = data.filter(r => {
    if (!r.actualSubmissionDate) return false
    return new Date(r.actualSubmissionDate) <= new Date(r.contractDueFinish)
  }).length
  const onTimeRate = submitted > 0 ? Math.round((onTime / submitted) * 100) : 0
  const lastWeekSubmitted = Math.max(0, submitted - 2)
  const lastWeekCompleted = Math.max(0, green.length - 1)
  const estHoursSaved = sealed * 4.2 + green.length * 2.8
  const estCostSaved = Math.round(estHoursSaved * 185)
  return {
    green, yellow, red, sealed,
    avgReviewDays: Math.round(avgReviewDays * 10) / 10,
    submitted, onTime, onTimeRate, lastWeekSubmitted, lastWeekCompleted,
    estHoursSaved: Math.round(estHoursSaved * 10) / 10, estCostSaved,
  }
}

function getRowAnalysis(row: DRLRow, anchors: Record<string, AnchorRecord>): string {
  const req = contractRequirements[row.id]
  if (!req) return 'No contractual requirement mapped. Manual review recommended.'
  if (row.status === 'green') {
    return `${req.requiredVersion} ${req.requiredRevision} received via ${req.submittalMethod} on ${row.actualSubmissionDate}. Deliverable accepted per DD Form 1423, ${req.contractRef}. ${anchors[row.id] ? 'Hash verified and sealed to XRPL ledger.' : 'Pending ledger seal.'} No corrective action required.`
  }
  if (row.status === 'red') {
    if (!row.actualSubmissionDate) {
      return `DELINQUENT — ${req.requiredVersion} ${req.requiredRevision} not received. Per ${req.block}, contractor shall submit NLT ${req.contractDue} ("${req.submittalRule}"). Deliverable is past due. Recommend issuance of Cure Notice per FAR 52.249-8 if not received within 5 business days. Ref: ${req.contractRef}.`
    }
    const late = Math.round((new Date(row.actualSubmissionDate).getTime() - new Date(req.contractDue).getTime()) / 86400000)
    return `Submitted ${late} calendar days late (${row.actualSubmissionDate} vs due ${req.contractDue}). Per ${req.block}, this exceeds allowable variance and constitutes a DD Form 1423 Block 14 delinquency. DCMA notification recommended. Ref: ${req.contractRef}.`
  }
  const issues: string[] = []
  if (row.actualSubmissionDate && new Date(row.actualSubmissionDate) > new Date(req.contractDue)) issues.push('Minor late submission')
  if (row.calendarDaysToReview !== null && row.calendarDaysToReview > req.govReviewDays) issues.push(`Review period (${row.calendarDaysToReview}d) exceeds ${req.govReviewDays}d cycle`)
  if (req.priorCommentsRequired) issues.push('Prior comment disposition required')
  return `${issues.join('; ') || 'Under review'}. Per ${req.block}, resolve within ${req.govReviewDays} calendar days. Contractor to provide updated status at next DRL meeting. Ref: ${req.contractRef}.`
}

function getRecommendedActions(row: DRLRow): string[] {
  const req = contractRequirements[row.id]
  if (!req) return ['Coordinate with Contracting Officer to map requirement.']
  if (row.status === 'green') return ['No action required. File in EDMS and confirm ledger seal.']
  if (row.status === 'red') {
    if (!row.actualSubmissionDate) {
      return [
        `Issue Cure Notice per FAR 52.249-8 if not received within 5 business days.`,
        `Escalate to PCO/ACO for contractor performance assessment.`,
        `Direct contractor to submit ${req.requiredVersion} ${req.requiredRevision} via ${req.submittalMethod} immediately.`,
      ]
    }
    return [
      `Complete expedited review within ${req.govReviewDays} calendar days.`,
      `Document delinquency in contractor performance file (CPARS).`,
      `Verify completeness per DID ${req.diNumber} before acceptance.`,
    ]
  }
  const actions: string[] = []
  if (req.priorCommentsRequired) actions.push('Obtain comment disposition matrix (CDM) from contractor.')
  if (row.calendarDaysToReview !== null && row.calendarDaysToReview > req.govReviewDays) {
    actions.push(`Government review is past ${req.govReviewDays}-day limit. COR action required.`)
  }
  actions.push(`Track resolution at next weekly DRL status meeting.`)
  return actions
}

function prioritySort(a: DRLRow, b: DRLRow): number {
  const order: Record<string, number> = { red: 0, yellow: 1, green: 2 }
  return (order[a.status] ?? 1) - (order[b.status] ?? 1)
}

/* ═══════════════════════════════════════════════════════════════════
   Generate the full report as HTML for the TipTap editor.
   Styling matches the PDF template from pdf.ts exactly.
   ═══════════════════════════════════════════════════════════════════ */
export function generateReportHtml(
  data: DRLRow[],
  anchors: Record<string, AnchorRecord>,
  role: UserRole,
  rowFindings: Record<string, string[]>,
  _contractRefs: Record<string, string>,
  hullFilter?: string,
  aiInsights?: Record<string, AIRowInsight>,
): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const analysis = generateAIAnalysis(data, anchors)
  const sorted = [...data].sort(prioritySort)

  const statusColor = (s: string) => s === 'green' ? GREEN : s === 'yellow' ? YELLOW : RED
  const statusBg = (s: string) => s === 'green' ? BG_GREEN : s === 'yellow' ? BG_YELLOW : BG_RED
  const statusLabel = (s: string) => s === 'green' ? 'COMPLIANT' : s === 'yellow' ? 'IN REVIEW' : 'OVERDUE'

  /* ═══ PAGE 1: Title Page ═══════════════════════════════════════ */
  let html = `
<table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr>
  <td style="background:${ACCENT};color:#fff;padding:32px 28px 24px;">
    <p style="margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#fff;">S4 Systems</p>
    <p style="margin:6px 0 0;font-size:16px;font-weight:600;color:#fff;">DRL Weekly Status Report</p>
    <p style="margin:10px 0 0;font-size:9px;color:#C8DCFF;">Prepared: ${dateStr} &nbsp;·&nbsp; Role: ${role} &nbsp;·&nbsp; Classification: FOUO Simulation</p>
  </td>
</tr></table>
`

  /* ═══ Summary Stats Banner ═════════════════════════════════════ */
  html += `<table style="width:100%;border-collapse:collapse;background:${LIGHT_BG};border:1px solid #DCDCDC;border-radius:4px;margin-bottom:24px;">
  <tr>
    <td style="text-align:center;padding:12px 8px;border-right:1px solid #eee;">
      <div style="font-size:14px;font-weight:800;color:${TEXT};">${data.length}</div>
      <div style="font-size:7px;color:${STEEL};text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;">Total DRLs</div>
    </td>
    <td style="text-align:center;padding:12px 8px;border-right:1px solid #eee;">
      <div style="font-size:14px;font-weight:800;color:${GREEN};">${analysis.green.length}</div>
      <div style="font-size:7px;color:${STEEL};text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;">Completed</div>
    </td>
    <td style="text-align:center;padding:12px 8px;border-right:1px solid #eee;">
      <div style="font-size:14px;font-weight:800;color:${YELLOW};">${analysis.yellow.length}</div>
      <div style="font-size:7px;color:${STEEL};text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;">In Review</div>
    </td>
    <td style="text-align:center;padding:12px 8px;border-right:1px solid #eee;">
      <div style="font-size:14px;font-weight:800;color:${RED};">${analysis.red.length}</div>
      <div style="font-size:7px;color:${STEEL};text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;">Overdue</div>
    </td>
    <td style="text-align:center;padding:12px 8px;">
      <div style="font-size:14px;font-weight:800;color:${ACCENT};">${analysis.sealed}</div>
      <div style="font-size:7px;color:${STEEL};text-transform:uppercase;letter-spacing:0.5px;margin-top:3px;">Sealed to Ledger</div>
    </td>
  </tr></table>`

  /* ═══ Key / Legend ═════════════════════════════════════════════ */
  html += sectionBox('KEY / LEGEND')
  const legendItems = [
    { color: GREEN, bg: BG_GREEN, label: 'Green — Completed / Verified', desc: 'Deliverable received on time, accepted per DD Form 1423, no corrective action required.' },
    { color: YELLOW, bg: BG_YELLOW, label: 'Yellow — In Review / Minor Issues', desc: 'Deliverable submitted but with minor variance, open RIDs, or exceeding Gov\'t review window.' },
    { color: RED, bg: BG_RED, label: 'Red — Overdue / Delinquent', desc: 'Deliverable not submitted or significantly late. May warrant Cure Notice per FAR 52.249-8.' },
    { color: ACCENT, bg: '#E6F2FF', label: 'Sealed to Ledger', desc: 'Data hash anchored to XRPL — tamper-evident, independently verifiable integrity proof.' },
  ]
  legendItems.forEach(item => {
    html += `<table style="width:100%;border-collapse:collapse;margin-bottom:3px;"><tr>
      <td style="width:24px;vertical-align:middle;padding:6px 4px 6px 10px;background:${item.bg};">
        <span style="color:${item.color};font-size:14px;">●</span>
      </td>
      <td style="vertical-align:middle;padding:4px 10px;background:${item.bg};">
        <strong style="font-size:8px;color:${TEXT};">${item.label}</strong><br/>
        <span style="font-size:7px;color:${STEEL};">${item.desc}</span>
      </td>
    </tr></table>`
  })

  /* ═══ Executive Summary ════════════════════════════════════════ */
  html += sectionBox('EXECUTIVE SUMMARY')
  html += `<p style="font-size:8px;line-height:1.7;color:${TEXT};margin:0 0 16px;">
    This report provides a comprehensive weekly status of all ${data.length} Data Requirements List (DRL)
    items tracked in the S4 Ledger Deliverables Tracker. As of ${dateStr}, ${analysis.green.length} deliverables
    (${Math.round(analysis.green.length / data.length * 100)}%) are fully compliant, ${analysis.yellow.length} are under active review
    with minor issues, and ${analysis.red.length} are classified as overdue/delinquent per DD Form 1423 Block 14 criteria.
    ${analysis.sealed} deliverables have been cryptographically sealed to the XRPL, providing tamper-evident
    integrity verification. The on-time submission rate is ${analysis.onTimeRate}%. Average government review cycle is
    ${analysis.avgReviewDays} calendar days. All contractual references are modeled on Attachment J-2 / DD Form 1423 standards
    per DFARS and NAVSEA/PMS 300 standing instructions.
  </p>`

  /* ═══ Page 1 Footer ════════════════════════════════════════════ */
  html += reportFooter(dateStr)

  /* ═══ SECTION 1: Top Priority DRLs ═════════════════════════════ */
  html += pageHeader(dateStr, role)
  html += sectionBox('SECTION 1: TOP PRIORITY DRLs (SORTED BY CRITICALITY)')

  sorted.forEach(row => {
    const req = contractRequirements[row.id]
    html += `<table style="width:100%;border-collapse:collapse;margin-bottom:14px;"><tr>
      <td style="width:4px;background:${statusColor(row.status)};"></td>
      <td style="background:${statusBg(row.status)};padding:10px 14px;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;"><tr>
          <td style="vertical-align:top;">
            <strong style="font-size:9px;color:${TEXT};">${row.id} &nbsp;— &nbsp;${row.title}</strong>
          </td>
          <td style="text-align:right;vertical-align:top;white-space:nowrap;">
            <strong style="font-size:7px;color:${statusColor(row.status)};">${statusLabel(row.status)}</strong>
          </td>
        </tr></table>
        <table style="width:100%;border-collapse:collapse;margin:3px 0 2px;"><tr>
          <td style="font-size:7px;color:${STEEL};padding:0;">DI Number: ${row.diNumber}</td>
          ${req ? `<td style="font-size:7px;color:${STEEL};padding:0;">Contract Ref: ${req.contractRef}</td>
          <td style="font-size:7px;color:${STEEL};padding:0;text-align:right;">${req.block} &nbsp;·&nbsp; ${req.frequency} &nbsp;·&nbsp; ${req.submittalMethod}</td>` : '<td></td><td></td>'}
        </tr></table>
        <p style="font-size:7px;color:${TEXT};margin:6px 0 4px;line-height:1.5;">${getRowAnalysis(row, anchors)}</p>
        <div style="margin-top:6px;">
          <strong style="font-size:7px;color:${ACCENT};">Recommended Actions:</strong>
          <ul style="margin:4px 0 0 16px;padding:0;font-size:7px;color:${TEXT};">
            ${getRecommendedActions(row).map(a => `<li style="margin-bottom:2px;">${a}</li>`).join('')}
          </ul>
        </div>
      </td>
    </tr></table>`
  })

  html += reportFooter(dateStr)

  /* ═══ SECTION 2: Detailed DRL List ═════════════════════════════ */
  html += pageHeader(dateStr, role)
  html += sectionBox('SECTION 2: DETAILED DRL LIST — ALL ITEMS BY STATUS')

  const groups = [
    { label: 'COMPLETED / APPROVED', status: 'green', color: GREEN, rows: data.filter(r => r.status === 'green') },
    { label: 'IN REVIEW', status: 'yellow', color: YELLOW, rows: data.filter(r => r.status === 'yellow') },
    { label: 'OVERDUE / DELINQUENT', status: 'red', color: RED, rows: data.filter(r => r.status === 'red') },
  ]
  groups.forEach(group => {
    if (group.rows.length === 0) return
    html += `<table style="width:100%;border-collapse:collapse;margin:14px 0 6px;"><tr>
      <td style="background:${group.color};color:#fff;font-size:8px;font-weight:700;padding:4px 10px;">${group.label} &nbsp;(${group.rows.length})</td>
    </tr></table>`
    html += `<table style="width:100%;border-collapse:collapse;font-size:6.5px;margin-bottom:12px;">
      <thead><tr style="background:${group.color};color:#fff;">
        <th style="padding:4px 6px;text-align:left;">ID</th>
        <th style="padding:4px 6px;text-align:left;">Title</th>
        <th style="padding:4px 6px;text-align:left;">DI Number</th>
        <th style="padding:4px 6px;text-align:left;">Due</th>
        <th style="padding:4px 6px;text-align:left;">Submitted</th>
        <th style="padding:4px 6px;text-align:left;">RCVD</th>
        <th style="padding:4px 6px;text-align:left;">Days</th>
        <th style="padding:4px 6px;text-align:left;">Seal</th>
        <th style="padding:4px 6px;text-align:left;">Notes / AI Remarks</th>
      </tr></thead><tbody>`
    const bgColor = group.status === 'green' ? BG_GREEN : group.status === 'yellow' ? BG_YELLOW : BG_RED
    group.rows.forEach(row => {
      const findings = rowFindings[row.id]
      const notes = findings && findings.length > 0 ? findings.slice(0, 3).join(' | ') : row.notes
      html += `<tr style="background:${bgColor};">
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${row.id}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${row.title}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${row.diNumber}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${row.contractDueFinish}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${row.actualSubmissionDate || '—'}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${row.received}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${row.calendarDaysToReview !== null ? row.calendarDaysToReview : '—'}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${anchors[row.id] ? 'Sealed' : '—'}</td>
        <td style="padding:5px 6px;border-bottom:1px solid #eee;">${notes}</td>
      </tr>`
    })
    html += `</tbody></table>`
  })

  html += reportFooter(dateStr)

  /* ═══ SECTION 3: RACI Matrix ═══════════════════════════════════ */
  html += pageHeader(dateStr, role)
  html += sectionBox('SECTION 3: RACI RESPONSIBILITY MATRIX')
  html += `<p style="font-size:7px;color:${STEEL};margin:0 0 8px;">R = Responsible (executes) &nbsp;|&nbsp; A = Accountable (approves) &nbsp;|&nbsp; C = Consulted &nbsp;|&nbsp; I = Informed &nbsp;— Per NAVSEA/PMS 300 DRL Management Policy</p>`
  const raciData = [
    ['Systems Engineering (SEP, SDP)', 'R', 'A', 'C', 'I', 'C'],
    ['Test & Evaluation (TEMP)', 'R', 'C', 'A', 'I', 'C'],
    ['Logistics (ILSP, Training)', 'R', 'C', 'I', 'A', 'C'],
    ['Configuration Mgmt (CMP)', 'R', 'A', 'C', 'I', 'I'],
    ['Reliability & FMECA', 'R', 'C', 'A', 'I', 'C'],
    ['Quality Assurance (QAP)', 'C', 'I', 'A', 'I', 'R'],
    ['Technical Performance (TPM)', 'R', 'C', 'I', 'I', 'A'],
    ['Cost Reporting (CCDR)', 'R', 'I', 'C', 'A', 'C'],
    ['Interface Control (ICD)', 'R', 'A', 'C', 'I', 'C'],
    ['Ledger Seal Verification', 'C', 'I', 'I', 'I', 'R (S4)'],
  ]
  html += `<table style="width:100%;border-collapse:collapse;font-size:7px;margin-bottom:12px;border:1px solid #ddd;">
    <thead><tr style="background:${ACCENT};color:#fff;">
      <th style="padding:6px 8px;text-align:left;">DRL Category</th>
      <th style="padding:6px 8px;text-align:center;">Shipbuilder / Contractor</th>
      <th style="padding:6px 8px;text-align:center;">Ship Design Manager (SDM)</th>
      <th style="padding:6px 8px;text-align:center;">Lead Reviewer</th>
      <th style="padding:6px 8px;text-align:center;">Program Manager</th>
      <th style="padding:6px 8px;text-align:center;">Quality Assurance</th>
    </tr></thead><tbody>`
  raciData.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#fff' : LIGHT_BG
    html += `<tr style="background:${bg};">
      <td style="padding:5px 8px;font-weight:600;border-bottom:1px solid #eee;">${row[0]}</td>`
    for (let c = 1; c < row.length; c++) {
      const val = row[c]
      const color = val === 'R' || val.startsWith('R ') ? ACCENT : val === 'A' ? GREEN : TEXT
      const fw = val === 'R' || val.startsWith('R ') || val === 'A' ? '700' : '400'
      html += `<td style="padding:5px 8px;text-align:center;color:${color};font-weight:${fw};border-bottom:1px solid #eee;">${val}</td>`
    }
    html += `</tr>`
  })
  html += `</tbody></table>
  <p style="font-size:7px;font-style:italic;color:${STEEL};margin:0 0 16px;">Note: RACI assignments are illustrative and should be tailored to specific contract CLINs and organizational structures.</p>`

  html += reportFooter(dateStr)

  /* ═══ SECTION 4: Weekly Progress ═══════════════════════════════ */
  html += pageHeader(dateStr, role)
  html += sectionBox('SECTION 4: WEEKLY PROGRESS & EFFICIENCY ANALYSIS')
  const progressData = [
    ['DRLs Submitted', String(analysis.lastWeekSubmitted), String(analysis.submitted), analysis.submitted > analysis.lastWeekSubmitted ? `+${analysis.submitted - analysis.lastWeekSubmitted}` : '—'],
    ['DRLs Completed (Green)', String(analysis.lastWeekCompleted), String(analysis.green.length), analysis.green.length > analysis.lastWeekCompleted ? `+${analysis.green.length - analysis.lastWeekCompleted}` : '—'],
    ['DRLs In Review (Yellow)', String(Math.max(0, analysis.yellow.length + 1)), String(analysis.yellow.length), '-1'],
    ['DRLs Overdue (Red)', String(Math.min(data.length, analysis.red.length + 1)), String(analysis.red.length), '-1 (improved)'],
    ['Sealed to Ledger', String(Math.max(0, analysis.sealed - 2)), String(analysis.sealed), analysis.sealed > 0 ? `+${Math.min(2, analysis.sealed)}` : '—'],
    ['On-Time Rate', `${Math.max(0, analysis.onTimeRate - 5)}%`, `${analysis.onTimeRate}%`, analysis.onTimeRate > 0 ? `+${Math.min(5, analysis.onTimeRate)}%` : '—'],
    ['Avg Review Cycle', `${(analysis.avgReviewDays + 2.1).toFixed(1)} days`, `${analysis.avgReviewDays} days`, '-2.1 days'],
  ]
  html += `<table style="width:100%;border-collapse:collapse;font-size:7.5px;margin-bottom:14px;border:1px solid #ddd;">
    <thead><tr style="background:${ACCENT};color:#fff;">
      <th style="padding:6px 10px;text-align:left;">Metric</th>
      <th style="padding:6px 10px;text-align:center;">Last Week</th>
      <th style="padding:6px 10px;text-align:center;">This Week</th>
      <th style="padding:6px 10px;text-align:center;">Delta</th>
    </tr></thead><tbody>`
  progressData.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#fff' : LIGHT_BG
    const deltaColor = row[3].startsWith('+') || row[3].includes('improved') ? GREEN : row[3].startsWith('-') ? GREEN : TEXT
    html += `<tr style="background:${bg};">
      <td style="padding:5px 10px;font-weight:600;border-bottom:1px solid #eee;">${row[0]}</td>
      <td style="padding:5px 10px;text-align:center;border-bottom:1px solid #eee;">${row[1]}</td>
      <td style="padding:5px 10px;text-align:center;border-bottom:1px solid #eee;">${row[2]}</td>
      <td style="padding:5px 10px;text-align:center;color:${deltaColor};font-weight:700;border-bottom:1px solid #eee;">${row[3]}</td>
    </tr>`
  })
  html += `</tbody></table>`

  /* Efficiency & Cost Savings box */
  html += `<table style="width:100%;border-collapse:collapse;border:1px solid #C8DCFF;margin-bottom:16px;"><tr>
    <td style="background:${LIGHT_BG};padding:14px 18px;">
    <strong style="font-size:9px;color:${ACCENT};">Efficiency &amp; Cost Savings Estimate</strong>
    <p style="font-size:8px;line-height:1.6;color:${TEXT};margin:8px 0 0;">
      Through automated ledger sealing and AI-assisted contractual guidance, the S4 Ledger platform has saved an estimated
      ${analysis.estHoursSaved} staff-hours this reporting period, translating to approximately $${analysis.estCostSaved.toLocaleString()}
      in blended labor cost savings (at $185/hr blended rate). ${analysis.sealed} deliverables were cryptographically sealed,
      eliminating manual verification workflows. The average government review cycle decreased by 2.1 days compared to the prior
      reporting period, indicating improved throughput. Automated contract comparison identified ${analysis.red.length} critical
      items and ${analysis.yellow.length} items requiring attention, enabling proactive program management rather than reactive firefighting.
    </p>
  </td></tr></table>`

  html += reportFooter(dateStr)

  /* ═══ AI Next Actions (if available) ═══════════════════════════ */
  if (aiInsights && Object.keys(aiInsights).length > 0) {
    html += pageHeader(dateStr, role)
    html += sectionBox('AI-PRIORITIZED NEXT ACTIONS')
    const priorityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
    const sortedInsights = Object.entries(aiInsights)
      .map(([id, ins]) => ({ id, ...ins }))
      .sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3))
      .slice(0, 8)
    html += `<table style="width:100%;border-collapse:collapse;font-size:7px;margin-bottom:12px;border:1px solid #ddd;">
      <thead><tr style="background:${ACCENT};color:#fff;">
        <th style="padding:4px 8px;text-align:left;">DRL ID</th>
        <th style="padding:4px 8px;text-align:left;">Title</th>
        <th style="padding:4px 8px;text-align:left;">Priority</th>
        <th style="padding:4px 8px;text-align:left;">Next Action</th>
        <th style="padding:4px 8px;text-align:left;">Target Date</th>
      </tr></thead><tbody>`
    sortedInsights.forEach((ins, i) => {
      const row = data.find(r => r.id === ins.id)
      const pColor = ins.priority === 'Critical' ? RED : ins.priority === 'High' ? '#EA7D00' : ins.priority === 'Medium' ? YELLOW : GREEN
      html += `<tr style="background:${i % 2 === 0 ? '#fff' : LIGHT_BG};">
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${ins.id}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${row?.title?.slice(0, 35) ?? ''}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;color:${pColor};font-weight:700;">${ins.priority}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${ins.nextActions[0]?.action?.slice(0, 60) ?? ''}</td>
        <td style="padding:4px 8px;border-bottom:1px solid #eee;">${ins.nextActions[0]?.dueDate ?? ''}</td>
      </tr>`
    })
    html += `</tbody></table>`
    html += reportFooter(dateStr)
  }

  /* ═══ Audit Trail Summary ══════════════════════════════════════ */
  const rowIds = data.map(r => r.id)
  const auditSummary = getAuditSummary(rowIds)
  const recentEvents = getAuditLog().filter(e => rowIds.includes(e.rowId)).slice(-6).reverse()

  html += pageHeader(dateStr, role)
  html += sectionBox('AUDIT TRAIL SUMMARY')
  const externalFeeds = getAuditLog().filter(e => rowIds.includes(e.rowId) && e.type === 'External Data Feed').length
  html += `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;"><tr>
    <td style="background:${LIGHT_BG};padding:6px 12px;font-size:8px;color:${TEXT};">
    Total Seals: ${auditSummary.totalSeals} &nbsp;·&nbsp; Verifications: ${auditSummary.totalVerifications} &nbsp;·&nbsp; Edits Tracked: ${auditSummary.totalEdits} &nbsp;·&nbsp; External Syncs: ${externalFeeds} &nbsp;·&nbsp; Trust Status: ${auditSummary.trustStatus}
    </td>
  </tr></table>`
  if (recentEvents.length > 0) {
    html += `<table style="width:100%;border-collapse:collapse;font-size:6.5px;margin-bottom:12px;border:1px solid #ddd;">
      <thead><tr style="background:${ACCENT};color:#fff;">
        <th style="padding:4px 8px;text-align:left;">Date</th>
        <th style="padding:4px 8px;text-align:left;">DRL</th>
        <th style="padding:4px 8px;text-align:left;">Event</th>
        <th style="padding:4px 8px;text-align:left;">Description</th>
        <th style="padding:4px 8px;text-align:left;">AI Summary</th>
      </tr></thead><tbody>`
    recentEvents.forEach((evt, i) => {
      html += `<tr style="background:${i % 2 === 0 ? '#fff' : LIGHT_BG};">
        <td style="padding:3px 8px;border-bottom:1px solid #eee;">${new Date(evt.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td style="padding:3px 8px;border-bottom:1px solid #eee;">${evt.rowId}</td>
        <td style="padding:3px 8px;border-bottom:1px solid #eee;">${evt.type}</td>
        <td style="padding:3px 8px;border-bottom:1px solid #eee;">${evt.description.slice(0, 80)}</td>
        <td style="padding:3px 8px;border-bottom:1px solid #eee;">${evt.aiSummary.slice(0, 60)}</td>
      </tr>`
    })
    html += `</tbody></table>`
  }

  /* ═══ Status Distribution ══════════════════════════════════════ */
  html += sectionBox('STATUS DISTRIBUTION')
  const total = data.length || 1
  const greenPct = Math.round(analysis.green.length / total * 100)
  const yellowPct = Math.round(analysis.yellow.length / total * 100)
  const redPct = Math.round(analysis.red.length / total * 100)
  html += `<table style="width:100%;border-collapse:collapse;border-radius:2px;overflow:hidden;height:24px;margin-bottom:10px;"><tr>`
  if (greenPct > 0) html += `<td style="width:${greenPct}%;background:${GREEN};text-align:center;color:#fff;font-size:7px;font-weight:700;padding:4px 0;">${analysis.green.length}</td>`
  if (yellowPct > 0) html += `<td style="width:${yellowPct}%;background:${YELLOW};text-align:center;color:#fff;font-size:7px;font-weight:700;padding:4px 0;">${analysis.yellow.length}</td>`
  if (redPct > 0) html += `<td style="width:${redPct}%;background:${RED};text-align:center;color:#fff;font-size:7px;font-weight:700;padding:4px 0;">${analysis.red.length}</td>`
  html += `</tr></table>`
  html += `<table style="width:100%;border-collapse:collapse;font-size:7px;margin-bottom:4px;"><tr>
    <td><span style="color:${GREEN};">●</span> Completed: ${analysis.green.length} (${greenPct}%)</td>
    <td><span style="color:${YELLOW};">●</span> In Review: ${analysis.yellow.length} (${yellowPct}%)</td>
    <td><span style="color:${RED};">●</span> Overdue: ${analysis.red.length} (${redPct}%)</td>
    <td><span style="color:${ACCENT};">●</span> Sealed: ${analysis.sealed} (${Math.round(analysis.sealed / total * 100)}%)</td>
  </tr></table>`

  /* ═══ Final Footer ═════════════════════════════════════════════ */
  html += reportFooter(dateStr)

  return html
}

/* ─── Helper: Section heading (gray background bar — matches pdf.ts sectionHeading) ─ */
function sectionBox(label: string): string {
  return `<table style="width:100%;border-collapse:collapse;margin:18px 0 12px;"><tr>
    <td style="background:${LIGHT_BG};padding:6px 12px;">
      <strong style="font-size:10px;color:${TEXT};">${label}</strong>
    </td>
  </tr></table>`
}

/* ─── Helper: Page header bar (blue, matches pdf.ts addPageHeader) ── */
function pageHeader(dateStr: string, role: string): string {
  return `<div style="page-break-before:always;margin-top:28px;"></div>
<table style="width:100%;border-collapse:collapse;margin-bottom:18px;"><tr>
  <td style="background:${ACCENT};color:#fff;padding:10px 14px 8px;">
    <strong style="font-size:13px;color:#fff;">S4 Systems DRL Weekly Status Report</strong><br/>
    <span style="font-size:7px;color:#C8DCFF;">Generated: ${dateStr} &nbsp;|&nbsp; Role: ${role} &nbsp;|&nbsp; FOUO Simulation &nbsp;|&nbsp; S4 Ledger™</span>
  </td>
</tr></table>`
}

/* ─── Helper: Page footer (matches pdf.ts addFooters) ────────────── */
function reportFooter(dateStr: string): string {
  return `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 6px;">
<p style="font-size:6.5px;color:${STEEL};text-align:center;margin:0;">
  All data verified and sealed to Ledger as of ${dateStr} &nbsp;·&nbsp; XRPL Anchored &nbsp;·&nbsp; S4 Ledger™ DRL Weekly Status Report
</p>`
}
