import { useState, useEffect } from 'react'
import { CDRLRow } from '../types'

interface Props {
  row: CDRLRow | null
  allData: CDRLRow[]
  onClose: () => void
}

function generateAnalysis(row: CDRLRow | null, allData: CDRLRow[]): string[] {
  const lines: string[] = []

  if (row) {
    lines.push(`ANALYSIS: ${row.title} (${row.id})`)
    lines.push('')

    if (row.status === 'red') {
      lines.push(`CRITICAL: This deliverable is OVERDUE.`)
      if (!row.actualSubmissionDate) {
        lines.push(`No submission date recorded — recommend immediate contractor escalation.`)
      }
      lines.push(`Contract due date was ${row.contractDueFinish}.`)
      lines.push(``)
      lines.push(`RECOMMENDED ACTIONS:`)
      lines.push(`  1. Issue Cure Notice if not already sent`)
      lines.push(`  2. Schedule contractor status call within 48 hours`)
      lines.push(`  3. Assess impact on dependent CDRLs and milestones`)
      lines.push(`  4. Document delay rationale in DRL tracking system`)
    } else if (row.status === 'yellow') {
      lines.push(`WARNING: This deliverable is under review with open items.`)
      lines.push(`Submitted: ${row.actualSubmissionDate || 'N/A'}`)
      lines.push(`Review period: ${row.calendarDaysToReview ?? 'N/A'} calendar days`)
      lines.push(``)
      lines.push(`RECOMMENDED ACTIONS:`)
      lines.push(`  1. Follow up with reviewing authority on open RIDs/comments`)
      lines.push(`  2. Set 5-business-day deadline for comment disposition`)
      lines.push(`  3. Verify no scope-creep in review comments`)
    } else {
      lines.push(`STATUS: Deliverable is approved and in good standing.`)
      lines.push(`Submitted: ${row.actualSubmissionDate}`)
      lines.push(`Reviewed in ${row.calendarDaysToReview} calendar days.`)
      lines.push(``)
      lines.push(`No action required. Record is eligible for Ledger Seal.`)
    }
  } else {
    const redCount = allData.filter(r => r.status === 'red').length
    const yellowCount = allData.filter(r => r.status === 'yellow').length
    const greenCount = allData.filter(r => r.status === 'green').length

    lines.push(`PORTFOLIO RISK ASSESSMENT`)
    lines.push(`========================`)
    lines.push(`Total CDRLs: ${allData.length}`)
    lines.push(`  Approved (Green):   ${greenCount}`)
    lines.push(`  In Review (Yellow): ${yellowCount}`)
    lines.push(`  Overdue (Red):      ${redCount}`)
    lines.push(``)

    if (redCount > 0) {
      lines.push(`HIGH RISK: ${redCount} deliverable(s) are overdue:`)
      allData.filter(r => r.status === 'red').forEach(r => {
        lines.push(`  - ${r.id}: ${r.title}`)
        lines.push(`    Due: ${r.contractDueFinish} | Notes: ${r.notes}`)
      })
      lines.push(``)
    }

    if (yellowCount > 0) {
      lines.push(`MODERATE RISK: ${yellowCount} deliverable(s) have open review items:`)
      allData.filter(r => r.status === 'yellow').forEach(r => {
        lines.push(`  - ${r.id}: ${r.title}`)
      })
      lines.push(``)
    }

    lines.push(`RECOMMENDATION:`)
    if (redCount >= 3) {
      lines.push(`  Immediate Program Management Review (PMR) recommended.`)
      lines.push(`  Multiple overdue CDRLs indicate systemic contractor performance issues.`)
    } else if (redCount > 0) {
      lines.push(`  Targeted contractor engagement for overdue items.`)
      lines.push(`  Monitor yellow items to prevent additional slippage.`)
    } else if (yellowCount > 0) {
      lines.push(`  Program is in acceptable status. Accelerate open reviews.`)
    } else {
      lines.push(`  All deliverables are current. Maintain steady monitoring cadence.`)
    }
  }

  return lines
}

export default function AIAssistModal({ row, allData, onClose }: Props) {
  const [lines, setLines] = useState<string[]>([])
  const [displayedLines, setDisplayedLines] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const analysis = generateAnalysis(row, allData)
    setLines(analysis)
    setDisplayedLines(0)
    setDone(false)

    let i = 0
    const timer = setInterval(() => {
      i++
      if (i >= analysis.length) {
        setDisplayedLines(analysis.length)
        setDone(true)
        clearInterval(timer)
      } else {
        setDisplayedLines(i)
      }
    }, 80)

    return () => clearInterval(timer)
  }, [row, allData])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="bg-white border border-border rounded-card p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
              <i className="fas fa-brain text-accent"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">AI Analysis</h3>
              <p className="text-steel text-xs">
                {row ? `${row.id} — ${row.title}` : 'Full Portfolio Assessment'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f5f5f7] rounded-lg p-4 font-mono text-xs leading-relaxed">
          {lines.slice(0, displayedLines).map((line, i) => (
            <div key={i} className={line === '' ? 'h-3' : 'text-green-400'}>
              {line}
            </div>
          ))}
          {!done && (
            <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5"></span>
          )}
        </div>

        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-black/[0.03] hover:bg-black/[0.06] border border-border rounded-lg text-sm text-steel transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
