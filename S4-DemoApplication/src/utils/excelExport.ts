/* ─── Excel / CSV Export Utility ─────────────────────────────────── */
import type { DRLRow, AnchorRecord, UserRole } from '../types'
import * as XLSX from 'xlsx'

export interface ExportOptions {
  format: 'xlsx' | 'csv'
  includeAudit: boolean
  includeAnchors: boolean
  hullFilter?: string
}

export interface ExportResult {
  blob: Blob
  filename: string
}

/** Map DRLRow to a flat export row */
function toExportRow(
  row: DRLRow,
  anchor?: AnchorRecord,
  includeAnchors = false,
) {
  const base: Record<string, unknown> = {
    'DRL ID': row.id,
    'Title': row.title,
    'DI Number': row.diNumber,
    'Contract Due/Finish': row.contractDueFinish,
    'Calculated Due Date': row.calculatedDueDate,
    'Submittal Guidance': row.submittalGuidance,
    'Actual Submission Date': row.actualSubmissionDate,
    'Received': row.received,
    'Calendar Days to Review': row.calendarDaysToReview ?? '',
    'Notes': row.notes,
    'Status': row.status.toUpperCase(),
    'Shipbuilder Notes': row.shipbuilderNotes ?? '',
    'Gov Notes': row.govNotes ?? '',
    'Responsible Party': row.responsibleParty ?? '',
  }
  if (includeAnchors && anchor) {
    base['Seal Hash'] = anchor.hash
    base['Seal TX'] = anchor.txHash
    base['Sealed At'] = anchor.timestamp
    base['Network'] = anchor.network
  }
  return base
}

export function exportToExcel(
  data: DRLRow[],
  anchors: Record<string, AnchorRecord>,
  _role: UserRole,
  options: ExportOptions,
): ExportResult {
  const rows = data.map(r =>
    toExportRow(r, anchors[r.id], options.includeAnchors),
  )

  const wb = XLSX.utils.book_new()

  // Main data sheet
  const ws = XLSX.utils.json_to_sheet(rows)

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(r => String(r[key] ?? '').length).slice(0, 50)) + 2,
  }))
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, 'DRL Data')

  // Summary sheet
  const green = data.filter(r => r.status === 'green').length
  const yellow = data.filter(r => r.status === 'yellow').length
  const red = data.filter(r => r.status === 'red').length
  const pending = data.filter(r => r.status === 'pending').length
  const sealed = data.filter(r => anchors[r.id]).length

  const summaryRows = [
    { Metric: 'Total DRLs', Value: data.length },
    { Metric: 'Completed (Green)', Value: green },
    { Metric: 'In Review (Yellow)', Value: yellow },
    { Metric: 'Overdue (Red)', Value: red },
    { Metric: 'Pending', Value: pending },
    { Metric: 'Sealed to Ledger', Value: sealed },
    { Metric: 'Compliance Rate', Value: `${data.length ? Math.round((green / data.length) * 100) : 0}%` },
    { Metric: 'Report Generated', Value: new Date().toISOString() },
    { Metric: 'Hull Filter', Value: options.hullFilter || 'All' },
  ]
  const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
  summaryWs['!cols'] = [{ wch: 25 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  // Status breakdown sheet
  const statusGroups = ['red', 'yellow', 'pending', 'green'] as const
  for (const status of statusGroups) {
    const filtered = data.filter(r => r.status === status)
    if (filtered.length === 0) continue
    const statusRows = filtered.map(r => toExportRow(r, anchors[r.id], options.includeAnchors))
    const statusWs = XLSX.utils.json_to_sheet(statusRows)
    const label = status === 'green' ? 'Completed' : status === 'yellow' ? 'In Review' : status === 'red' ? 'Overdue' : 'Pending'
    XLSX.utils.book_append_sheet(wb, statusWs, label)
  }

  const dateStr = new Date().toISOString().slice(0, 10)
  const hullSuffix = options.hullFilter ? `_${options.hullFilter.replace(/\s+/g, '_')}` : ''

  if (options.format === 'csv') {
    const csvData = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    return {
      blob,
      filename: `S4_DRL_Export${hullSuffix}_${dateStr}.csv`,
    }
  }

  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbOut], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  return {
    blob,
    filename: `S4_DRL_Export${hullSuffix}_${dateStr}.xlsx`,
  }
}
