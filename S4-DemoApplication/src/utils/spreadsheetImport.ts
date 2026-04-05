/**
 * Spreadsheet Import Pipeline
 * ────────────────────────────────────────────────────────────
 * Deterministic Excel/CSV parsing via SheetJS + AI-assisted
 * column mapping + validation + auto-seal on import.
 *
 * Cell reading is 100% deterministic (SheetJS). AI only suggests
 * column mappings — which the user confirms before any data touches
 * the DRL tracker.
 */

import * as XLSX from 'xlsx'
import { DRLRow, ColumnKey } from '../types'
import { sha256 } from './hash'

/* ─── Types ──────────────────────────────────────────────────── */

export interface ParsedSheet {
  name: string
  headers: string[]
  rows: string[][]          // raw cell values as strings
  rowCount: number
  colCount: number
}

export interface ParsedWorkbook {
  fileName: string
  fileSize: number
  fileSHA256: string         // SHA-256 of the raw file bytes
  sheets: ParsedSheet[]
  parsedAt: string
}

export interface ColumnMapping {
  sourceIndex: number        // index into the parsed sheet headers
  sourceHeader: string       // original header text from the file
  targetField: keyof DRLRow  // DRL field this maps to
  targetLabel: string        // human-readable label for the target
  confidence: 'high' | 'medium' | 'low'
  method: 'exact' | 'fuzzy' | 'ai' | 'manual'
}

export interface ValidationIssue {
  rowIndex: number
  field: keyof DRLRow
  sourceValue: string
  issue: string
  severity: 'error' | 'warning' | 'info'
  suggestion?: string
}

export interface ImportPreviewRow {
  sourceRowIndex: number
  mapped: Partial<DRLRow>
  issues: ValidationIssue[]
  isValid: boolean
}

export interface ImportResult {
  rows: DRLRow[]
  totalParsed: number
  totalImported: number
  totalSkipped: number
  issues: ValidationIssue[]
  importedAt: string
  sourceFile: string
  sourceSHA256: string
  mappingUsed: ColumnMapping[]
}

/* ─── DRL Field Metadata (for mapping) ───────────────────────── */

interface FieldMeta {
  field: keyof DRLRow
  label: string
  aliases: string[]          // known header variations
  required: boolean
  type: 'string' | 'date' | 'number' | 'yesno' | 'status' | 'org'
}

const DRL_FIELDS: FieldMeta[] = [
  {
    field: 'title',
    label: 'DRL Title / Revisions',
    aliases: ['title', 'drl title', 'deliverable title', 'drl(s) title', 'revisions', 's4 drl(s) title / revisions', 'data item title', 'deliverable', 'item title', 'description'],
    required: true,
    type: 'string',
  },
  {
    field: 'diNumber',
    label: 'DI Number',
    aliases: ['di number', 'di num', 'di no', 'di#', 'data item number', 'data item no', 'di', 'item number'],
    required: true,
    type: 'string',
  },
  {
    field: 'contractDueFinish',
    label: 'Contract Due: Finish',
    aliases: ['contract due', 'contract due: finish', 'contract due date', 'due date', 'due finish', 'contract finish', 'finish date', 'required date'],
    required: false,
    type: 'date',
  },
  {
    field: 'calculatedDueDate',
    label: 'Calculated Due Date',
    aliases: ['calculated due date', 'calc due date', 'calculated due', 'calc date', 'projected date'],
    required: false,
    type: 'date',
  },
  {
    field: 'submittalGuidance',
    label: 'Submittal Guidance',
    aliases: ['submittal guidance', 'submittal', 'guidance', 'submission guidance', 'submission instructions'],
    required: false,
    type: 'string',
  },
  {
    field: 'actualSubmissionDate',
    label: 'Actual Submission Date',
    aliases: ['actual submission date', 'submission date', 'actual date', 'date submitted', 'submitted', 'submitted date', 'submit date'],
    required: false,
    type: 'date',
  },
  {
    field: 'received',
    label: 'Received',
    aliases: ['received', 'rcvd', 'recv', 'rcv', 'rec', 'received?'],
    required: false,
    type: 'yesno',
  },
  {
    field: 'calendarDaysToReview',
    label: 'Calendar Days to Review',
    aliases: ['calendar days to review', 'cal days to review', 'cal days', 'days to review', 'review days', 'review period', 'calendar days'],
    required: false,
    type: 'number',
  },
  {
    field: 'notes',
    label: 'Notes / Remarks',
    aliases: ['notes', 'remarks', 'notes / remarks', 'comments', 'notes/remarks', 'comment', 'note'],
    required: false,
    type: 'string',
  },
  {
    field: 'responsibleParty',
    label: 'Responsible Party',
    aliases: ['responsible party', 'responsible', 'party', 'assigned to', 'owner', 'resp party'],
    required: false,
    type: 'org',
  },
  {
    field: 'status',
    label: 'Status',
    aliases: ['status', 'state', 'condition', 'health', 'rag status', 'rag'],
    required: false,
    type: 'status',
  },
  {
    field: 'shipbuilderNotes',
    label: 'Shipbuilder Notes',
    aliases: ['shipbuilder notes', 'sb notes', 'yard notes', 'builder notes', 'shipyard notes'],
    required: false,
    type: 'string',
  },
  {
    field: 'govNotes',
    label: "Gov't Internal Notes",
    aliases: ['gov notes', "gov't notes", "gov't internal notes", 'government notes', 'internal notes', 'govt notes'],
    required: false,
    type: 'string',
  },
]

/* ─── Step 1: Parse File (deterministic, 100% accurate) ──────── */

export async function parseSpreadsheetFile(file: File): Promise<ParsedWorkbook> {
  const buffer = await file.arrayBuffer()

  // Compute SHA-256 of the raw file
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const fileSHA256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Parse with SheetJS — reads every cell exactly as stored
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    cellNF: true,        // preserve number formats
    cellText: true,      // generate text representations
    raw: false,          // use formatted strings
  })

  const sheets: ParsedSheet[] = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,           // return array of arrays
      raw: false,          // formatted strings
      defval: '',          // empty cells → empty string
      blankrows: false,    // skip blank rows
    })

    if (jsonData.length === 0) {
      return { name, headers: [], rows: [], rowCount: 0, colCount: 0 }
    }

    // First non-empty row with multiple values is the header
    let headerIdx = 0
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
      const nonEmpty = jsonData[i].filter(c => c && c.toString().trim()).length
      if (nonEmpty >= 2) {
        headerIdx = i
        break
      }
    }

    const headers = jsonData[headerIdx].map(h => (h || '').toString().trim())
    const rows = jsonData.slice(headerIdx + 1).filter(row =>
      row.some(cell => cell && cell.toString().trim())
    )

    return {
      name,
      headers,
      rows: rows.map(r => r.map(c => (c || '').toString().trim())),
      rowCount: rows.length,
      colCount: headers.length,
    }
  })

  return {
    fileName: file.name,
    fileSize: file.size,
    fileSHA256,
    sheets,
    parsedAt: new Date().toISOString(),
  }
}

/* ─── Step 2: Auto-Map Columns (deterministic first, AI fallback) */

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export function autoMapColumns(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  const usedTargets = new Set<keyof DRLRow>()
  const usedSources = new Set<number>()

  // Pass 1: Exact alias match
  for (let i = 0; i < headers.length; i++) {
    const norm = normalizeHeader(headers[i])
    if (!norm) continue

    for (const meta of DRL_FIELDS) {
      if (usedTargets.has(meta.field)) continue
      const exactMatch = meta.aliases.some(a => normalizeHeader(a) === norm)
      if (exactMatch) {
        mappings.push({
          sourceIndex: i,
          sourceHeader: headers[i],
          targetField: meta.field,
          targetLabel: meta.label,
          confidence: 'high',
          method: 'exact',
        })
        usedTargets.add(meta.field)
        usedSources.add(i)
        break
      }
    }
  }

  // Pass 2: Fuzzy substring match for remaining
  for (let i = 0; i < headers.length; i++) {
    if (usedSources.has(i)) continue
    const norm = normalizeHeader(headers[i])
    if (!norm) continue

    for (const meta of DRL_FIELDS) {
      if (usedTargets.has(meta.field)) continue
      const fuzzy = meta.aliases.some(a => {
        const na = normalizeHeader(a)
        return norm.includes(na) || na.includes(norm)
      })
      if (fuzzy) {
        mappings.push({
          sourceIndex: i,
          sourceHeader: headers[i],
          targetField: meta.field,
          targetLabel: meta.label,
          confidence: 'medium',
          method: 'fuzzy',
        })
        usedTargets.add(meta.field)
        usedSources.add(i)
        break
      }
    }
  }

  return mappings
}

/** Get list of DRL fields available for manual mapping */
export function getAvailableTargetFields(currentMappings: ColumnMapping[]): { field: keyof DRLRow; label: string }[] {
  const usedTargets = new Set(currentMappings.map(m => m.targetField))
  return DRL_FIELDS
    .filter(m => !usedTargets.has(m.field))
    .map(m => ({ field: m.field, label: m.label }))
}

/* ─── Step 3: Validate & Build Preview ───────────────────────── */

function validateCellValue(value: string, fieldMeta: FieldMeta): { valid: boolean; issue?: string; suggestion?: string } {
  if (!value || value.trim() === '') {
    if (fieldMeta.required) {
      return { valid: false, issue: `Required field "${fieldMeta.label}" is empty` }
    }
    return { valid: true }
  }

  switch (fieldMeta.type) {
    case 'date': {
      // Accept many date formats — SheetJS normalizes most
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,           // 2026-01-15
        /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,   // 1/15/2026 or 01/15/26
        /^\d{1,2}-\w{3}-\d{2,4}$/,       // 15-Jan-2026
        /^\w{3}\s+\d{1,2},?\s+\d{4}$/,   // Jan 15, 2026
      ]
      const isDateLike = datePatterns.some(p => p.test(value.trim()))
      if (!isDateLike) {
        return { valid: false, issue: `Value "${value}" doesn't look like a date`, suggestion: 'Expected format: YYYY-MM-DD' }
      }
      return { valid: true }
    }
    case 'number': {
      const num = parseFloat(value)
      if (isNaN(num)) {
        return { valid: false, issue: `Value "${value}" is not a number` }
      }
      return { valid: true }
    }
    case 'yesno': {
      const v = value.toLowerCase().trim()
      if (!['yes', 'no', 'y', 'n', 'true', 'false', '1', '0'].includes(v)) {
        return { valid: false, issue: `Value "${value}" — expected Yes or No`, suggestion: 'Use "Yes" or "No"' }
      }
      return { valid: true }
    }
    case 'status': {
      const v = value.toLowerCase().trim()
      if (!['green', 'yellow', 'red', 'pending', 'complete', 'on track', 'at risk', 'overdue', 'behind'].includes(v)) {
        return { valid: false, issue: `Status "${value}" not recognized`, suggestion: 'Use: green, yellow, red, or pending' }
      }
      return { valid: true }
    }
    case 'org': {
      const v = value.toLowerCase().trim()
      if (!['government', 'contractor', 'shipbuilder', 'gov', "gov't", 'contr', 'sb'].includes(v)) {
        return { valid: false, issue: `Party "${value}" not recognized`, suggestion: 'Use: Government, Contractor, or Shipbuilder' }
      }
      return { valid: true }
    }
    default:
      return { valid: true }
  }
}

function normalizeValue(value: string, fieldMeta: FieldMeta): string | number | null {
  if (!value || value.trim() === '') {
    if (fieldMeta.type === 'number') return null
    if (fieldMeta.type === 'yesno') return 'No'
    return ''
  }

  switch (fieldMeta.type) {
    case 'yesno': {
      const v = value.toLowerCase().trim()
      return ['yes', 'y', 'true', '1'].includes(v) ? 'Yes' : 'No'
    }
    case 'status': {
      const v = value.toLowerCase().trim()
      if (v === 'complete' || v === 'on track') return 'green'
      if (v === 'at risk' || v === 'behind') return 'yellow'
      if (v === 'overdue') return 'red'
      if (['green', 'yellow', 'red', 'pending'].includes(v)) return v
      return 'pending'
    }
    case 'org': {
      const v = value.toLowerCase().trim()
      if (v.includes('gov')) return 'Government'
      if (v.includes('contr')) return 'Contractor'
      if (v.includes('ship') || v === 'sb') return 'Shipbuilder'
      return value
    }
    case 'number': {
      const num = parseFloat(value)
      return isNaN(num) ? null : num
    }
    default:
      return value.trim()
  }
}

export function buildImportPreview(
  sheet: ParsedSheet,
  mappings: ColumnMapping[],
): ImportPreviewRow[] {
  return sheet.rows.map((row, rowIdx) => {
    const mapped: Partial<DRLRow> = {}
    const issues: ValidationIssue[] = []

    for (const mapping of mappings) {
      const rawValue = row[mapping.sourceIndex] || ''
      const fieldMeta = DRL_FIELDS.find(f => f.field === mapping.targetField)

      if (fieldMeta) {
        const validation = validateCellValue(rawValue, fieldMeta)
        if (!validation.valid && validation.issue) {
          issues.push({
            rowIndex: rowIdx,
            field: mapping.targetField,
            sourceValue: rawValue,
            issue: validation.issue,
            severity: fieldMeta.required ? 'error' : 'warning',
            suggestion: validation.suggestion,
          })
        }

        const normalized = normalizeValue(rawValue, fieldMeta)
        ;(mapped as Record<string, unknown>)[mapping.targetField] = normalized
      }
    }

    // Check required fields that aren't mapped
    for (const meta of DRL_FIELDS) {
      if (meta.required && !(meta.field in mapped)) {
        issues.push({
          rowIndex: rowIdx,
          field: meta.field,
          sourceValue: '',
          issue: `Required field "${meta.label}" has no mapping`,
          severity: 'error',
        })
      }
    }

    return {
      sourceRowIndex: rowIdx,
      mapped,
      issues,
      isValid: !issues.some(i => i.severity === 'error'),
    }
  })
}

/* ─── Step 4: Build final DRLRow objects ────────────────────── */

export function buildDRLRows(
  preview: ImportPreviewRow[],
  contractId: string,
  existingIds: Set<string>,
): DRLRow[] {
  let counter = 1
  return preview
    .filter(p => p.isValid)
    .map(p => {
      // Generate unique ID
      let id: string
      do {
        id = `IMP-${String(counter++).padStart(3, '0')}`
      } while (existingIds.has(id))
      existingIds.add(id)

      const m = p.mapped
      return {
        id,
        contractId,
        title: (m.title as string) || 'Untitled',
        diNumber: (m.diNumber as string) || 'TBD',
        contractDueFinish: (m.contractDueFinish as string) || '',
        calculatedDueDate: (m.calculatedDueDate as string) || '',
        submittalGuidance: (m.submittalGuidance as string) || '',
        actualSubmissionDate: (m.actualSubmissionDate as string) || '',
        received: (m.received as string) || 'No',
        calendarDaysToReview: (m.calendarDaysToReview as number | null) ?? null,
        notes: (m.notes as string) || '',
        status: ((m.status as string) || 'pending') as DRLRow['status'],
        shipbuilderNotes: (m.shipbuilderNotes as string) || '',
        govNotes: (m.govNotes as string) || '',
        responsibleParty: (m.responsibleParty as DRLRow['responsibleParty']) || undefined,
      }
    })
}

/* ─── Step 5: Generate import audit hash ─────────────────────── */

export async function generateImportAuditHash(
  fileSHA256: string,
  rows: DRLRow[],
  mappings: ColumnMapping[],
): Promise<string> {
  const payload = JSON.stringify({
    fileSHA256,
    rowCount: rows.length,
    rowIds: rows.map(r => r.id),
    mappingFields: mappings.map(m => `${m.sourceHeader}→${m.targetField}`),
    timestamp: new Date().toISOString(),
  })
  return sha256(payload)
}

/* ─── Helpers ────────────────────────────────────────────────── */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export { DRL_FIELDS }
