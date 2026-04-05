import { useState, useRef, useCallback } from 'react'
import DraggableModal from './DraggableModal'
import { DRLRow, AnchorRecord } from '../types'
import {
  parseSpreadsheetFile,
  autoMapColumns,
  getAvailableTargetFields,
  buildImportPreview,
  buildDRLRows,
  generateImportAuditHash,
  formatFileSize,
  DRL_FIELDS,
  type ParsedWorkbook,
  type ParsedSheet,
  type ColumnMapping,
  type ImportPreviewRow,
  type ValidationIssue,
} from '../utils/spreadsheetImport'
import { recordExternalFeed } from '../utils/auditTrail'
import { recordChange } from '../utils/changeLog'

type Step = 'upload' | 'sheet' | 'map' | 'preview' | 'importing' | 'done'

interface Props {
  existingData: DRLRow[]
  contractId: string
  userRole: string
  userEmail?: string
  userOrg?: string
  onImport: (rows: DRLRow[], auditInfo: ImportAuditInfo) => void
  onClose: () => void
}

export interface ImportAuditInfo {
  fileName: string
  fileSHA256: string
  importHash: string
  rowCount: number
  mappings: ColumnMapping[]
  importedAt: string
  totalParsed: number
  totalSkipped: number
  issues: ValidationIssue[]
}

export default function SpreadsheetImportModal({
  existingData,
  contractId,
  userRole,
  userEmail,
  userOrg,
  onImport,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<ParsedSheet | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [preview, setPreview] = useState<ImportPreviewRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportAuditInfo | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ─── Step 1: File Upload ──────────────────────────────────── */
  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['xlsx', 'xls', 'csv', 'xlsm', 'xlsb'].includes(ext)) {
      setError('Unsupported file type. Please upload .xlsx, .xls, .csv, .xlsm, or .xlsb')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50 MB limit')
      return
    }

    setError(null)
    setParsing(true)
    try {
      const parsed = await parseSpreadsheetFile(file)
      setWorkbook(parsed)

      // If only one sheet with data, auto-select it
      const dataSheets = parsed.sheets.filter(s => s.rowCount > 0)
      if (dataSheets.length === 1) {
        selectSheet(dataSheets[0])
      } else if (dataSheets.length === 0) {
        setError('No data found in the uploaded file')
        setParsing(false)
        return
      } else {
        setStep('sheet')
      }
    } catch (e) {
      setError(`Failed to parse file: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
    setParsing(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  /* ─── Step 2: Select Sheet ─────────────────────────────────── */
  function selectSheet(sheet: ParsedSheet) {
    setSelectedSheet(sheet)
    const autoMappings = autoMapColumns(sheet.headers)
    setMappings(autoMappings)
    setStep('map')
  }

  /* ─── Step 3: Column Mapping ───────────────────────────────── */
  function updateMapping(sourceIndex: number, targetField: keyof DRLRow | '') {
    if (targetField === '') {
      // Remove mapping
      setMappings(prev => prev.filter(m => m.sourceIndex !== sourceIndex))
    } else {
      const meta = DRL_FIELDS.find(f => f.field === targetField)
      if (!meta) return
      setMappings(prev => {
        // Remove any existing mapping for this target or source
        const filtered = prev.filter(m => m.sourceIndex !== sourceIndex && m.targetField !== targetField)
        return [...filtered, {
          sourceIndex,
          sourceHeader: selectedSheet!.headers[sourceIndex],
          targetField,
          targetLabel: meta.label,
          confidence: 'high' as const,
          method: 'manual' as const,
        }]
      })
    }
  }

  function proceedToPreview() {
    if (!selectedSheet) return
    const previewData = buildImportPreview(selectedSheet, mappings)
    setPreview(previewData)
    setStep('preview')
  }

  /* ─── Step 4: Import with seal ─────────────────────────────── */
  async function executeImport() {
    if (!selectedSheet || !workbook) return
    setStep('importing')
    setImportProgress(0)

    // Build rows
    const existingIds = new Set(existingData.map(r => r.id))
    const validPreview = preview.filter(p => p.isValid)
    const importedRows = buildDRLRows(preview, contractId, existingIds)

    // Simulate progress for UX
    for (let i = 0; i <= 80; i += 10) {
      setImportProgress(i)
      await new Promise(r => setTimeout(r, 100))
    }

    // Generate audit hash
    const importHash = await generateImportAuditHash(
      workbook.fileSHA256,
      importedRows,
      mappings,
    )

    setImportProgress(90)

    // Record audit trail entries for each imported row
    for (const row of importedRows) {
      recordExternalFeed(
        row,
        `Spreadsheet Import: ${workbook.fileName}`,
        `Imported from "${workbook.fileName}" (SHA-256: ${workbook.fileSHA256.slice(0, 16)}…). ` +
        `${mappings.length} fields mapped. Import batch hash: ${importHash.slice(0, 16)}…`
      )
      // Change log entry
      recordChange({
        userId: undefined,
        userEmail: userEmail || undefined,
        userRole,
        userOrg: userOrg || undefined,
        rowId: row.id,
        rowTitle: row.title,
        field: '*',
        oldValue: '',
        newValue: `Imported from ${workbook.fileName}`,
        changeType: 'external_sync',
      })
    }

    setImportProgress(100)

    const auditInfo: ImportAuditInfo = {
      fileName: workbook.fileName,
      fileSHA256: workbook.fileSHA256,
      importHash,
      rowCount: importedRows.length,
      mappings,
      importedAt: new Date().toISOString(),
      totalParsed: preview.length,
      totalSkipped: preview.length - validPreview.length,
      issues: preview.flatMap(p => p.issues),
    }

    setImportResult(auditInfo)
    setStep('done')

    // Trigger the actual import — parent component will merge data + auto-seal
    onImport(importedRows, auditInfo)
  }

  /* ─── Render Helpers ───────────────────────────────────────── */
  const totalErrors = preview.filter(p => !p.isValid).length
  const totalWarnings = preview.reduce((c, p) => c + p.issues.filter(i => i.severity === 'warning').length, 0)
  const validRows = preview.filter(p => p.isValid).length

  return (
    <DraggableModal className="bg-white rounded-xl shadow-2xl" defaultWidth={780} minWidth={600}>
      <div className="overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <i className="fas fa-file-import text-accent"></i>
                Import Spreadsheet
              </h3>
              <p className="text-[11px] text-steel mt-0.5">
                {step === 'upload' && 'Upload an existing DRL spreadsheet to import into the tracker'}
                {step === 'sheet' && `${workbook?.fileName} — Select the sheet containing your data`}
                {step === 'map' && `${selectedSheet?.name} — ${selectedSheet?.rowCount} rows · Map columns to DRL fields`}
                {step === 'preview' && `Validate ${preview.length} rows before import`}
                {step === 'importing' && 'Importing and sealing records…'}
                {step === 'done' && 'Import complete — all records sealed to audit trail'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Step indicator */}
              <div className="flex items-center gap-1">
                {(['upload', 'map', 'preview', 'done'] as const).map((s, i) => (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      s === step || (step === 'sheet' && s === 'upload') || (step === 'importing' && s === 'preview')
                        ? 'bg-accent'
                        : (['upload', 'sheet', 'map', 'preview', 'importing', 'done'].indexOf(step) > ['upload', 'sheet', 'map', 'preview', 'importing', 'done'].indexOf(s))
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-gray-200 text-steel inline-flex items-center justify-center">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* ─── Upload Step ───────────────────────────────── */}
          {(step === 'upload') && (
            <div className="p-6">
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-300 hover:border-accent/50 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.xlsm,.xlsb"
                  onChange={handleFileInput}
                  className="hidden"
                />
                {parsing ? (
                  <div className="space-y-3">
                    <i className="fas fa-spinner fa-spin text-3xl text-accent"></i>
                    <p className="text-sm font-medium text-gray-600">Parsing spreadsheet…</p>
                    <p className="text-xs text-steel">Reading every cell with 100% accuracy</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-xl bg-accent/10 flex items-center justify-center">
                      <i className="fas fa-file-excel text-2xl text-accent"></i>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Drop your spreadsheet here or <span className="text-accent">browse</span>
                      </p>
                      <p className="text-xs text-steel mt-1">
                        Supports .xlsx, .xls, .csv — up to 50 MB
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-steel">
                      <span className="flex items-center gap-1">
                        <i className="fas fa-shield-alt text-green-500"></i>
                        Data stays in your browser
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-check-circle text-green-500"></i>
                        Deterministic cell reading
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fas fa-lock text-green-500"></i>
                        SHA-256 file hash recorded
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <i className="fas fa-exclamation-circle text-red-500"></i>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ─── Sheet Selection Step ──────────────────────── */}
          {step === 'sheet' && workbook && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                <i className="fas fa-info-circle text-blue-500"></i>
                <div className="text-xs text-blue-700">
                  <strong>{workbook.fileName}</strong> contains {workbook.sheets.length} sheet{workbook.sheets.length !== 1 ? 's' : ''}.
                  Select the one with your DRL data.
                </div>
              </div>

              <div className="space-y-2">
                {workbook.sheets.map((sheet, i) => (
                  <button
                    key={i}
                    onClick={() => selectSheet(sheet)}
                    disabled={sheet.rowCount === 0}
                    className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg text-left transition-all ${
                      sheet.rowCount > 0
                        ? 'border-border hover:border-accent/50 hover:bg-accent/5 cursor-pointer'
                        : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className={`fas fa-table ${sheet.rowCount > 0 ? 'text-accent' : 'text-steel'}`}></i>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{sheet.name}</p>
                        <p className="text-[11px] text-steel">
                          {sheet.rowCount} rows · {sheet.colCount} columns
                          {sheet.rowCount === 0 && ' · Empty'}
                        </p>
                      </div>
                    </div>
                    {sheet.rowCount > 0 && (
                      <i className="fas fa-chevron-right text-xs text-steel"></i>
                    )}
                  </button>
                ))}
              </div>

              <div className="text-[10px] text-steel flex items-center gap-1.5">
                <i className="fas fa-fingerprint text-accent"></i>
                File SHA-256: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">{workbook.fileSHA256.slice(0, 24)}…</code>
                <span>· {formatFileSize(workbook.fileSize)}</span>
              </div>
            </div>
          )}

          {/* ─── Column Mapping Step ───────────────────────── */}
          {step === 'map' && selectedSheet && (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 bg-accent/5 border border-accent/20 rounded-lg">
                <i className="fas fa-columns text-accent"></i>
                <div className="text-xs text-gray-700">
                  <strong>{mappings.length}</strong> of {selectedSheet.headers.filter(h => h.trim()).length} columns auto-mapped.
                  Review and adjust the mappings below, then continue to preview.
                </div>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border">
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 w-[40%]">Source Column</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600 w-[20px]"></th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 w-[40%]">Maps To</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-600 w-[60px]">Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSheet.headers.map((header, i) => {
                      if (!header.trim()) return null
                      const mapping = mappings.find(m => m.sourceIndex === i)
                      const available = getAvailableTargetFields(mappings.filter(m => m.sourceIndex !== i))
                      const sampleValues = selectedSheet.rows.slice(0, 3).map(r => r[i] || '').filter(Boolean)

                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-gray-50/50">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{header}</div>
                            {sampleValues.length > 0 && (
                              <div className="text-[10px] text-steel mt-0.5 truncate max-w-[250px]">
                                e.g. {sampleValues.slice(0, 2).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="px-1 text-center text-steel">
                            <i className="fas fa-arrow-right text-[9px]"></i>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={mapping?.targetField || ''}
                              onChange={e => updateMapping(i, e.target.value as keyof DRLRow | '')}
                              className={`w-full px-2 py-1 text-xs border rounded-md transition-colors ${
                                mapping
                                  ? 'border-green-300 bg-green-50/50 text-gray-900'
                                  : 'border-gray-200 bg-white text-steel'
                              }`}
                            >
                              <option value="">— Skip —</option>
                              {mapping && (
                                <option value={mapping.targetField}>{mapping.targetLabel}</option>
                              )}
                              {available.map(f => (
                                <option key={f.field} value={f.field}>{f.label}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {mapping ? (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                mapping.confidence === 'high'
                                  ? 'bg-green-100 text-green-700'
                                  : mapping.confidence === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-steel'
                              }`}>
                                {mapping.method === 'exact' ? (
                                  <><i className="fas fa-check-circle text-[8px]"></i>Exact</>
                                ) : mapping.method === 'fuzzy' ? (
                                  <><i className="fas fa-search text-[8px]"></i>Fuzzy</>
                                ) : (
                                  <><i className="fas fa-user text-[8px]"></i>Manual</>
                                )}
                              </span>
                            ) : (
                              <span className="text-steel/40">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="text-[10px] text-steel flex items-center gap-1.5">
                <i className="fas fa-fingerprint text-accent"></i>
                File hash: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">{workbook?.fileSHA256.slice(0, 16)}…</code>
              </div>
            </div>
          )}

          {/* ─── Preview & Validate Step ───────────────────── */}
          {step === 'preview' && (
            <div className="p-6 space-y-4">
              {/* Summary badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <i className="fas fa-check-circle text-green-500 text-xs"></i>
                  <span className="text-xs font-medium text-green-700">{validRows} ready to import</span>
                </div>
                {totalErrors > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                    <i className="fas fa-exclamation-circle text-red-500 text-xs"></i>
                    <span className="text-xs font-medium text-red-700">{totalErrors} rows with errors (will skip)</span>
                  </div>
                )}
                {totalWarnings > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <i className="fas fa-exclamation-triangle text-yellow-500 text-xs"></i>
                    <span className="text-xs font-medium text-yellow-700">{totalWarnings} warnings</span>
                  </div>
                )}
              </div>

              {/* Preview table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr className="border-b border-border">
                        <th className="px-2 py-2 text-left font-semibold text-gray-600 w-[30px]">#</th>
                        <th className="px-2 py-2 text-center font-semibold text-gray-600 w-[30px]">
                          <i className="fas fa-check text-[9px]"></i>
                        </th>
                        {mappings.map(m => (
                          <th key={m.targetField} className="px-2 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                            {m.targetLabel}
                          </th>
                        ))}
                        <th className="px-2 py-2 text-left font-semibold text-gray-600">Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 100).map((row, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-border/50 ${
                            !row.isValid ? 'bg-red-50/50' : row.issues.length > 0 ? 'bg-yellow-50/30' : ''
                          }`}
                        >
                          <td className="px-2 py-1.5 text-gray-500 font-mono">{idx + 1}</td>
                          <td className="px-2 py-1.5 text-center">
                            {row.isValid ? (
                              <i className="fas fa-check-circle text-green-500 text-[10px]"></i>
                            ) : (
                              <i className="fas fa-times-circle text-red-500 text-[10px]"></i>
                            )}
                          </td>
                          {mappings.map(m => {
                            const val = row.mapped[m.targetField]
                            const hasIssue = row.issues.some(i => i.field === m.targetField)
                            return (
                              <td
                                key={m.targetField}
                                className={`px-2 py-1.5 max-w-[150px] truncate ${
                                  hasIssue ? 'text-red-600 font-medium' : 'text-gray-700'
                                }`}
                                title={String(val ?? '')}
                              >
                                {val !== null && val !== undefined ? String(val) : '—'}
                              </td>
                            )
                          })}
                          <td className="px-2 py-1.5">
                            {row.issues.length > 0 ? (
                              <div className="space-y-0.5">
                                {row.issues.map((issue, ii) => (
                                  <div key={ii} className={`text-[10px] flex items-start gap-1 ${
                                    issue.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                                  }`}>
                                    <i className={`fas fa-${issue.severity === 'error' ? 'times-circle' : 'exclamation-triangle'} mt-0.5 text-[8px]`}></i>
                                    <span>{issue.issue}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-green-500 text-[10px]">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 100 && (
                  <div className="px-3 py-2 text-center text-[10px] text-steel bg-gray-50 border-t border-border">
                    Showing first 100 of {preview.length} rows
                  </div>
                )}
              </div>

              {/* Seal notice */}
              <div className="flex items-center gap-3 px-4 py-3 bg-accent/5 border border-accent/20 rounded-lg">
                <i className="fas fa-shield-alt text-accent"></i>
                <div className="text-xs text-gray-700">
                  <strong>Auto-Seal on Import:</strong> Each imported record will be automatically sealed to the audit trail
                  with SHA-256 file hash, column mapping record, and import batch hash for full traceability.
                </div>
              </div>
            </div>
          )}

          {/* ─── Importing Step ────────────────────────────── */}
          {step === 'importing' && (
            <div className="p-12 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                <i className="fas fa-spinner fa-spin text-3xl text-accent"></i>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Importing & Sealing Records</p>
                <p className="text-xs text-steel mt-1">
                  Recording audit trail, generating import hash, sealing data integrity…
                </p>
              </div>
              <div className="max-w-xs mx-auto">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-steel mt-1">{importProgress}%</p>
              </div>
            </div>
          )}

          {/* ─── Done Step ─────────────────────────────────── */}
          {step === 'done' && importResult && (
            <div className="p-6 space-y-4">
              <div className="text-center space-y-3 py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                  <i className="fas fa-check text-2xl text-green-600"></i>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Import Complete</p>
                  <p className="text-xs text-steel mt-1">
                    {importResult.rowCount} records imported and sealed to the audit trail
                  </p>
                </div>
              </div>

              {/* Audit receipt */}
              <div className="bg-gray-50 border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <i className="fas fa-receipt text-accent text-xs"></i>
                  <span className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Import Audit Receipt</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-steel">Source File</span>
                    <p className="font-medium text-gray-900 truncate">{importResult.fileName}</p>
                  </div>
                  <div>
                    <span className="text-steel">Imported At</span>
                    <p className="font-medium text-gray-900">{new Date(importResult.importedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-steel">File Hash (SHA-256)</span>
                    <p className="font-mono text-[10px] text-gray-700 break-all">{importResult.fileSHA256.slice(0, 32)}…</p>
                  </div>
                  <div>
                    <span className="text-steel">Import Batch Hash</span>
                    <p className="font-mono text-[10px] text-gray-700 break-all">{importResult.importHash.slice(0, 32)}…</p>
                  </div>
                  <div>
                    <span className="text-steel">Rows Imported</span>
                    <p className="font-medium text-green-600">{importResult.rowCount}</p>
                  </div>
                  <div>
                    <span className="text-steel">Rows Skipped (errors)</span>
                    <p className="font-medium text-red-500">{importResult.totalSkipped}</p>
                  </div>
                  <div>
                    <span className="text-steel">Fields Mapped</span>
                    <p className="font-medium text-gray-900">{importResult.mappings.length}</p>
                  </div>
                  <div>
                    <span className="text-steel">Trust Status</span>
                    <p className="font-medium text-green-600">
                      <i className="fas fa-shield-alt mr-1 text-[10px]"></i>Sealed
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border">
                  <span className="text-[10px] text-steel">Column Mappings Used:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {importResult.mappings.map(m => (
                      <span key={m.targetField} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 text-accent rounded text-[9px] font-medium">
                        {m.sourceHeader} → {m.targetLabel}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-gray-50/30 flex items-center justify-between flex-shrink-0">
          <div className="text-[10px] text-steel">
            {step === 'map' && `${selectedSheet?.rowCount} rows · ${mappings.length} mapped`}
            {step === 'preview' && `${validRows} valid · ${totalErrors} errors · ${totalWarnings} warnings`}
          </div>
          <div className="flex items-center gap-2">
            {step !== 'done' && step !== 'importing' && (
              <button
                onClick={step === 'upload' ? onClose : () => setStep(
                  step === 'sheet' ? 'upload' :
                  step === 'map' ? (workbook && workbook.sheets.filter(s => s.rowCount > 0).length > 1 ? 'sheet' : 'upload') :
                  'map'
                )}
                className="px-3 py-1.5 text-xs text-steel hover:text-gray-900 rounded-md hover:bg-gray-100 transition-all"
              >
                {step === 'upload' ? 'Cancel' : 'Back'}
              </button>
            )}

            {step === 'map' && (
              <button
                onClick={proceedToPreview}
                disabled={mappings.length === 0}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-md transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview Import <i className="fas fa-arrow-right ml-1.5"></i>
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={executeImport}
                disabled={validRows === 0}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <i className="fas fa-file-import mr-1.5"></i>
                Import {validRows} Record{validRows !== 1 ? 's' : ''} & Seal
              </button>
            )}

            {step === 'done' && (
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-md transition-all shadow-sm"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </DraggableModal>
  )
}
