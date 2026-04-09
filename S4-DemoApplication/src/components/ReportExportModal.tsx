import { useState } from 'react'
import DraggableModal from './DraggableModal'
import ReportEditor from './ReportEditor'
import { DRLRow, AnchorRecord, UserRole } from '../types'
import { generateWeeklyReport } from '../utils/pdf'
import { exportToExcel } from '../utils/excelExport'
import { generateReportHtml } from '../utils/reportHtmlGenerator'
import { AIRowInsight } from '../utils/aiAnalysis'

interface Props {
  data: DRLRow[]
  anchors: Record<string, AnchorRecord>
  role: UserRole
  rowFindings: Record<string, string[]>
  contractRefs: Record<string, string>
  hullFilter?: string
  aiInsights?: Record<string, AIRowInsight>
  onClose: () => void
}

type ExportFormat = 'pdf' | 'xlsx' | 'csv'
type ScheduleFreq = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'

interface ScheduleConfig {
  frequency: ScheduleFreq
  format: ExportFormat
  email: string
  includeAnchors: boolean
  time: string
}

const SCHEDULE_STORAGE_KEY = 's4_report_schedules'

function loadSchedules(): ScheduleConfig[] {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSchedules(schedules: ScheduleConfig[]) {
  localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedules))
}

export default function ReportExportModal({
  data, anchors, role, rowFindings, contractRefs, hullFilter, aiInsights, onClose,
}: Props) {
  const [tab, setTab] = useState<'export' | 'schedule' | 'history'>('export')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [includeAnchors, setIncludeAnchors] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editorHtml, setEditorHtml] = useState('')

  // Schedule state
  const [schedules, setSchedules] = useState<ScheduleConfig[]>(loadSchedules)
  const [schedFreq, setSchedFreq] = useState<ScheduleFreq>('weekly')
  const [schedFormat, setSchedFormat] = useState<ExportFormat>('pdf')
  const [schedEmail, setSchedEmail] = useState('')
  const [schedTime, setSchedTime] = useState('08:00')
  const [schedSaved, setSchedSaved] = useState(false)

  // History state
  const [history] = useState<Array<{ filename: string; format: string; date: string; rows: number }>>(() => {
    try {
      const raw = localStorage.getItem('s4_export_history')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const stats = {
    total: data.length,
    green: data.filter(r => r.status === 'green').length,
    yellow: data.filter(r => r.status === 'yellow').length,
    red: data.filter(r => r.status === 'red').length,
    sealed: Object.keys(anchors).length,
    compliance: data.length ? Math.round((data.filter(r => r.status === 'green').length / data.length) * 100) : 0,
  }

  async function handleGenerate() {
    setGenerating(true)
    setProgress(0)
    setError(null)

    try {
      if (format === 'pdf') {
        // Generate HTML for the editor preview
        const phases = ['Analyzing data…', 'Building references…', 'Priority assessment…', 'RACI matrix…', 'Progress metrics…', 'Building preview…']
        for (let i = 0; i < phases.length; i++) {
          setProgress(i + 1)
          await new Promise(r => setTimeout(r, 300 + Math.random() * 200))
        }
        const html = generateReportHtml(data, anchors, role, rowFindings, contractRefs, hullFilter, aiInsights)
        setEditorHtml(html)
        setShowEditor(true)
        setGenerating(false)
        return // Don't record in history yet — user will export from editor
      } else {
        setProgress(1)
        await new Promise(r => setTimeout(r, 200))
        setProgress(2)
        const excelResult = exportToExcel(data, anchors, role, {
          format: format as 'xlsx' | 'csv',
          includeAudit: false,
          includeAnchors,
          hullFilter,
        })
        setProgress(3)
        setResult(excelResult)
      }

      // Record in history
      const entry = {
        filename: result?.filename || `S4_Export_${new Date().toISOString().slice(0, 10)}.${format}`,
        format,
        date: new Date().toISOString(),
        rows: data.length,
      }
      const prev = history.slice(0, 49)
      prev.unshift(entry)
      localStorage.setItem('s4_export_history', JSON.stringify(prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }

    setGenerating(false)
  }

  function handleDownload() {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleEmail() {
    if (!result) return
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const subject = encodeURIComponent(`S4 Systems DRL Status Report${hullFilter ? ` — ${hullFilter}` : ''} — ${dateStr}`)
    const body = encodeURIComponent(
      `Please find attached the S4 Systems DRL Status Report for ${dateStr}.\n\n` +
      `Summary:\n• Total DRLs: ${stats.total}\n• Completed: ${stats.green}\n• In Review: ${stats.yellow}\n• Overdue: ${stats.red}\n• Sealed: ${stats.sealed}\n\n` +
      `Report generated by S4 Ledger™ Deliverables Tracker.\n\nNote: The report has been downloaded — please attach it to this email.`
    )
    handleDownload()
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  /* ─── Editor export handlers ─────────────────────────────── */
  function handleEditorExportPdf(_editedHtml: string) {
    // Generate PDF from the original data (PDF layout is handled by jsPDF, not HTML)
    const pdfResult = generateWeeklyReport(data, anchors, role, rowFindings, contractRefs, hullFilter, aiInsights)
    const url = URL.createObjectURL(pdfResult.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = pdfResult.filename
    a.click()
    URL.revokeObjectURL(url)
    // Record in history
    const entry = { filename: pdfResult.filename, format: 'pdf', date: new Date().toISOString(), rows: data.length }
    const prev = (history || []).slice(0, 49)
    prev.unshift(entry)
    localStorage.setItem('s4_export_history', JSON.stringify(prev))
  }

  function handleEditorExportExcel() {
    const excelResult = exportToExcel(data, anchors, role, {
      format: 'xlsx',
      includeAudit: false,
      includeAnchors: true,
      hullFilter,
    })
    const url = URL.createObjectURL(excelResult.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = excelResult.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleEditorExportCsv() {
    const csvResult = exportToExcel(data, anchors, role, {
      format: 'csv',
      includeAudit: false,
      includeAnchors: true,
      hullFilter,
    })
    const url = URL.createObjectURL(csvResult.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = csvResult.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleAddSchedule() {
    if (!schedEmail.trim()) return
    const newSched: ScheduleConfig = {
      frequency: schedFreq,
      format: schedFormat,
      email: schedEmail.trim(),
      includeAnchors: true,
      time: schedTime,
    }
    const updated = [...schedules, newSched]
    setSchedules(updated)
    saveSchedules(updated)
    setSchedSaved(true)
    setTimeout(() => setSchedSaved(false), 2000)
    setSchedEmail('')
  }

  function handleRemoveSchedule(index: number) {
    const updated = schedules.filter((_, i) => i !== index)
    setSchedules(updated)
    saveSchedules(updated)
  }

  const formatIcon = format === 'pdf' ? 'fa-file-pdf text-red-500' : format === 'xlsx' ? 'fa-file-excel text-green-600' : 'fa-file-csv text-blue-500'
  const formatLabel = format === 'pdf' ? 'PDF Report' : format === 'xlsx' ? 'Excel Workbook' : 'CSV Data'

  /* ─── If editor is open, render it full-screen instead of the modal ─── */
  if (showEditor) {
    return (
      <ReportEditor
        initialHtml={editorHtml}
        onExportPdf={handleEditorExportPdf}
        onExportExcel={handleEditorExportExcel}
        onExportCsv={handleEditorExportCsv}
        onClose={() => setShowEditor(false)}
      />
    )
  }

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={620} onClose={onClose} ariaLabel="Reports & Export">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <i className="fas fa-chart-bar text-accent"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Reports & Export</h3>
              <p className="text-steel text-xs">Generate, export, and schedule DRL reports{hullFilter ? ` — ${hullFilter}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {([['export', 'fa-download', 'Export'], ['schedule', 'fa-clock', 'Schedule'], ['history', 'fa-history', 'History']] as const).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-steel hover:text-gray-700'
              }`}
            >
              <i className={`fas ${icon} text-[10px]`}></i>
              {label}
            </button>
          ))}
        </div>

        {/* ─── Export Tab ──────────────────────────────────── */}
        {tab === 'export' && (
          <div>
            {/* Format Selector */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {([['pdf', 'fa-file-pdf', 'PDF Report', 'text-red-500', 'bg-red-50 border-red-200'], ['xlsx', 'fa-file-excel', 'Excel', 'text-green-600', 'bg-green-50 border-green-200'], ['csv', 'fa-file-csv', 'CSV', 'text-blue-500', 'bg-blue-50 border-blue-200']] as const).map(([fmt, icon, label, color, activeBg]) => (
                <button
                  key={fmt}
                  onClick={() => { setFormat(fmt); setResult(null) }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                    format === fmt ? `${activeBg} border-current` : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <i className={`fas ${icon} text-lg ${format === fmt ? color : 'text-gray-400'}`}></i>
                  <span className={`text-xs font-semibold ${format === fmt ? 'text-gray-900' : 'text-steel'}`}>{label}</span>
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-gray-900">{stats.total}</p>
                <p className="text-[9px] text-steel uppercase">Total</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-green-500">{stats.green}</p>
                <p className="text-[9px] text-green-600 uppercase">Complete</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-yellow-500">{stats.yellow}</p>
                <p className="text-[9px] text-yellow-600 uppercase">Review</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-red-500">{stats.red}</p>
                <p className="text-[9px] text-red-600 uppercase">Overdue</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 text-center">
                <p className="text-base font-bold text-accent">{stats.sealed}</p>
                <p className="text-[9px] text-accent uppercase">Sealed</p>
              </div>
            </div>

            {/* Options */}
            {format !== 'pdf' && (
              <label className="flex items-center gap-2 mb-4 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAnchors}
                  onChange={e => setIncludeAnchors(e.target.checked)}
                  className="rounded border-gray-300 text-accent"
                />
                Include seal/anchor data (hash, TX, timestamp)
              </label>
            )}

            {/* What's included */}
            {format === 'pdf' && (
              <div className="bg-gray-50 border border-border rounded-lg p-3 mb-4">
                <p className="text-[10px] font-semibold text-gray-900 mb-1.5 uppercase tracking-wider">Report includes:</p>
                <div className="grid grid-cols-2 gap-1">
                  {['Executive Summary', 'Priority Assessment', 'RACI Matrix', 'Progress Metrics', 'AI Next Actions', 'Audit Summary', 'Status Distribution', 'Ledger Proof'].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                      <i className="fas fa-check text-accent text-[8px]"></i>
                      <span className="text-[10px] text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5">
                  <i className="fas fa-edit text-accent text-[8px]"></i>
                  <span className="text-[10px] text-gray-600 font-medium">Opens in full document editor with AI assistant for review & editing</span>
                </div>
              </div>
            )}
            {format === 'xlsx' && (
              <div className="bg-gray-50 border border-border rounded-lg p-3 mb-4">
                <p className="text-[10px] font-semibold text-gray-900 mb-1.5 uppercase tracking-wider">Workbook sheets:</p>
                <div className="grid grid-cols-2 gap-1">
                  {['DRL Data (all rows)', 'Summary Statistics', 'Overdue Items', 'In Review Items', 'Pending Items', 'Completed Items'].map(item => (
                    <div key={item} className="flex items-center gap-1.5">
                      <i className="fas fa-check text-green-500 text-[8px]"></i>
                      <span className="text-[10px] text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg mb-4">
                <i className="fas fa-exclamation-circle text-red-500"></i>
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Generate / Download */}
            {!result ? (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    {format === 'pdf' ? `AI Analyzing… (${progress}/6)` : `Exporting… (${progress}/3)`}
                  </>
                ) : (
                  <>
                    <i className={`fas ${formatIcon}`}></i>
                    {format === 'pdf' ? 'Generate & Preview Report' : `Generate ${formatLabel}`}
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2.5 bg-green-50 border border-green-200 rounded-lg">
                  <i className="fas fa-check-circle text-green-500"></i>
                  <p className="text-xs text-green-800 font-medium">{result.filename}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-semibold transition-all"
                  >
                    <i className="fas fa-download"></i>
                    Download
                  </button>
                  <button
                    onClick={handleEmail}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 rounded-lg text-white text-sm font-semibold transition-all"
                  >
                    <i className="fas fa-envelope"></i>
                    Email
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Schedule Tab ─────────────────────────────────── */}
        {tab === 'schedule' && (
          <div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
                <p className="text-xs text-amber-800">
                  Scheduled reports are saved locally. When a backend email service is configured, reports will be automatically generated and delivered.
                </p>
              </div>
            </div>

            {/* Existing schedules */}
            {schedules.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-900 mb-2">Active Schedules</p>
                <div className="space-y-2">
                  {schedules.map((sch, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          sch.format === 'pdf' ? 'bg-red-100' : sch.format === 'xlsx' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <i className={`fas ${sch.format === 'pdf' ? 'fa-file-pdf text-red-500' : sch.format === 'xlsx' ? 'fa-file-excel text-green-600' : 'fa-file-csv text-blue-500'} text-sm`}></i>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900 capitalize">{sch.frequency} {sch.format.toUpperCase()}</p>
                          <p className="text-[10px] text-steel">{sch.email} at {sch.time}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSchedule(i)}
                        className="text-steel hover:text-red-500 transition-colors"
                        title="Remove schedule"
                      >
                        <i className="fas fa-trash-alt text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new schedule */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-900">Add Schedule</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-steel uppercase tracking-wider mb-1 block">Frequency</label>
                  <select
                    value={schedFreq}
                    onChange={e => setSchedFreq(e.target.value as ScheduleFreq)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-steel uppercase tracking-wider mb-1 block">Format</label>
                  <select
                    value={schedFormat}
                    onChange={e => setSchedFormat(e.target.value as ExportFormat)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-white"
                  >
                    <option value="pdf">PDF Report</option>
                    <option value="xlsx">Excel Workbook</option>
                    <option value="csv">CSV Data</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-steel uppercase tracking-wider mb-1 block">Email</label>
                  <input
                    type="email"
                    value={schedEmail}
                    onChange={e => setSchedEmail(e.target.value)}
                    placeholder="recipient@navy.mil"
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-steel uppercase tracking-wider mb-1 block">Time</label>
                  <input
                    type="time"
                    value={schedTime}
                    onChange={e => setSchedTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg"
                  />
                </div>
              </div>
              <button
                onClick={handleAddSchedule}
                disabled={!schedEmail.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-40"
              >
                {schedSaved ? (
                  <><i className="fas fa-check"></i> Schedule Saved</>
                ) : (
                  <><i className="fas fa-plus"></i> Add Schedule</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── History Tab ──────────────────────────────────── */}
        {tab === 'history' && (
          <div>
            {history.length === 0 ? (
              <div className="text-center py-8 text-steel">
                <i className="fas fa-file-export text-2xl mb-2 opacity-30"></i>
                <p className="text-xs">No exports yet. Generate a report to see history.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-3">
                      <i className={`fas ${entry.format === 'pdf' ? 'fa-file-pdf text-red-500' : entry.format === 'xlsx' ? 'fa-file-excel text-green-600' : 'fa-file-csv text-blue-500'}`}></i>
                      <div>
                        <p className="text-xs font-medium text-gray-900">{entry.filename}</p>
                        <p className="text-[10px] text-steel">{new Date(entry.date).toLocaleString()} — {entry.rows} rows</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DraggableModal>
  )
}
