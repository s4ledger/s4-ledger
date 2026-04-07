/**
 * ═══════════════════════════════════════════════════════════════
 *  Spreadsheet Import Tests — column mapping, validation, preview
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import {
  autoMapColumns,
  getAvailableTargetFields,
  buildImportPreview,
  buildDRLRows,
  type ParsedSheet,
  type ColumnMapping,
} from '../utils/spreadsheetImport'

/* ─── autoMapColumns ─────────────────────────────────────────── */

describe('autoMapColumns', () => {
  it('maps exact alias matches with high confidence', () => {
    const headers = ['DRL Title', 'DI Number', 'Contract Due: Finish', 'Notes']
    const mappings = autoMapColumns(headers)
    expect(mappings.length).toBeGreaterThanOrEqual(4)

    const titleMap = mappings.find(m => m.targetField === 'title')
    expect(titleMap).toBeDefined()
    expect(titleMap!.confidence).toBe('high')
    expect(titleMap!.method).toBe('exact')
  })

  it('maps known alias variations', () => {
    const headers = ['Deliverable Title', 'Data Item Number', 'Remarks']
    const mappings = autoMapColumns(headers)

    expect(mappings.find(m => m.targetField === 'title')).toBeDefined()
    expect(mappings.find(m => m.targetField === 'diNumber')).toBeDefined()
  })

  it('does not duplicate target fields', () => {
    const headers = ['Title', 'DRL Title', 'Deliverable']
    const mappings = autoMapColumns(headers)
    const titleMappings = mappings.filter(m => m.targetField === 'title')
    expect(titleMappings).toHaveLength(1)
  })

  it('fuzzy matches substring headers', () => {
    const headers = ['Review Days']
    const mappings = autoMapColumns(headers)
    const match = mappings.find(m => m.targetField === 'calendarDaysToReview')
    expect(match).toBeDefined()
    // 'review days' is a known alias → exact match
    expect(match!.confidence).toBe('high')
  })

  it('returns empty for unrecognized headers', () => {
    const headers = ['Foo', 'Bar', 'Baz']
    const mappings = autoMapColumns(headers)
    expect(mappings).toHaveLength(0)
  })
})

/* ─── getAvailableTargetFields ───────────────────────────────── */

describe('getAvailableTargetFields', () => {
  it('excludes already-mapped fields', () => {
    const existing: ColumnMapping[] = [
      { sourceIndex: 0, sourceHeader: 'Title', targetField: 'title', targetLabel: 'DRL Title', confidence: 'high', method: 'exact' },
    ]
    const available = getAvailableTargetFields(existing)
    expect(available.find(f => f.field === 'title')).toBeUndefined()
    expect(available.find(f => f.field === 'diNumber')).toBeDefined()
  })
})

/* ─── buildImportPreview ─────────────────────────────────────── */

describe('buildImportPreview', () => {
  const sheet: ParsedSheet = {
    name: 'Sheet1',
    headers: ['Title', 'DI Number', 'Status', 'Days'],
    rows: [
      ['Test DRL Item', 'DI-MISC-81927', 'green', '30'],
      ['', 'DI-MISC-81928', 'invalid_status', 'abc'],
    ],
    rowCount: 2,
    colCount: 4,
  }

  const mappings: ColumnMapping[] = [
    { sourceIndex: 0, sourceHeader: 'Title', targetField: 'title', targetLabel: 'DRL Title', confidence: 'high', method: 'exact' },
    { sourceIndex: 1, sourceHeader: 'DI Number', targetField: 'diNumber', targetLabel: 'DI Number', confidence: 'high', method: 'exact' },
    { sourceIndex: 2, sourceHeader: 'Status', targetField: 'status', targetLabel: 'Status', confidence: 'high', method: 'exact' },
    { sourceIndex: 3, sourceHeader: 'Days', targetField: 'calendarDaysToReview', targetLabel: 'Calendar Days', confidence: 'medium', method: 'fuzzy' },
  ]

  it('produces preview rows matching sheet row count', () => {
    const preview = buildImportPreview(sheet, mappings)
    expect(preview).toHaveLength(2)
  })

  it('marks valid rows as isValid', () => {
    const preview = buildImportPreview(sheet, mappings)
    expect(preview[0].isValid).toBe(true)
  })

  it('marks rows with missing required title as invalid', () => {
    const preview = buildImportPreview(sheet, mappings)
    // Row 1 has empty title (required field)
    expect(preview[1].isValid).toBe(false)
    expect(preview[1].issues.some(i => i.field === 'title')).toBe(true)
  })

  it('flags invalid status values as warnings', () => {
    const preview = buildImportPreview(sheet, mappings)
    const statusIssue = preview[1].issues.find(i => i.field === 'status')
    expect(statusIssue).toBeDefined()
  })

  it('flags non-numeric values for number fields', () => {
    const preview = buildImportPreview(sheet, mappings)
    const daysIssue = preview[1].issues.find(i => i.field === 'calendarDaysToReview')
    expect(daysIssue).toBeDefined()
    expect(daysIssue!.issue).toContain('not a number')
  })
})

/* ─── buildDRLRows ───────────────────────────────────────────── */

describe('buildDRLRows', () => {
  it('generates unique IDs and filters invalid rows', () => {
    const preview = [
      { sourceRowIndex: 0, mapped: { title: 'Item A', diNumber: 'DI-001' }, issues: [], isValid: true },
      { sourceRowIndex: 1, mapped: { title: '', diNumber: 'DI-002' }, issues: [{ rowIndex: 1, field: 'title' as const, sourceValue: '', issue: 'Required', severity: 'error' as const }], isValid: false },
      { sourceRowIndex: 2, mapped: { title: 'Item C', diNumber: 'DI-003' }, issues: [], isValid: true },
    ]
    const rows = buildDRLRows(preview, 'CTR-001', new Set())
    expect(rows).toHaveLength(2)
    expect(rows[0].id).toBe('IMP-001')
    expect(rows[1].id).toBe('IMP-002')
    expect(rows[0].contractId).toBe('CTR-001')
  })

  it('skips existing IDs', () => {
    const preview = [
      { sourceRowIndex: 0, mapped: { title: 'Item A', diNumber: 'DI-001' }, issues: [], isValid: true },
    ]
    const existing = new Set(['IMP-001'])
    const rows = buildDRLRows(preview, 'CTR-001', existing)
    expect(rows[0].id).toBe('IMP-002')
  })

  it('assigns status from mapped data', () => {
    const preview = [
      { sourceRowIndex: 0, mapped: { title: 'Item', diNumber: 'DI-001', status: 'green' as const }, issues: [], isValid: true },
    ]
    const rows = buildDRLRows(preview, 'CTR-001', new Set())
    expect(rows[0].status).toBe('green')
  })
})
