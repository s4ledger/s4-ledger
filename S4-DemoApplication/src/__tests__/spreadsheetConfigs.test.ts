/**
 * ═══════════════════════════════════════════════════════════════
 *  Spreadsheet Configs Tests — org configs, grants, column structure
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import {
  getSpreadsheetConfig,
  getContractorColumnsWithGrants,
  CONTRACTOR_GRANTABLE_COLUMNS,
} from '../utils/spreadsheetConfigs'

describe('getSpreadsheetConfig', () => {
  it('returns Government config with correct label', () => {
    const cfg = getSpreadsheetConfig('Government')
    expect(cfg.org).toBe('Government')
    expect(cfg.label).toContain('Government')
    expect(cfg.columns.length).toBeGreaterThan(0)
  })

  it('returns Contractor config with correct label', () => {
    const cfg = getSpreadsheetConfig('Contractor')
    expect(cfg.org).toBe('Contractor')
    expect(cfg.label).toContain('Contractor')
  })

  it('returns Shipbuilder config with correct label', () => {
    const cfg = getSpreadsheetConfig('Shipbuilder')
    expect(cfg.org).toBe('Shipbuilder')
    expect(cfg.label).toContain('Shipbuilder')
  })

  it('Government has the most columns', () => {
    const gov = getSpreadsheetConfig('Government')
    const con = getSpreadsheetConfig('Contractor')
    const sb = getSpreadsheetConfig('Shipbuilder')
    expect(gov.columns.length).toBeGreaterThanOrEqual(con.columns.length)
    expect(gov.columns.length).toBeGreaterThan(sb.columns.length)
  })

  it('Government config includes govNotes column', () => {
    const cfg = getSpreadsheetConfig('Government')
    expect(cfg.columns.some(c => c.key === 'govNotes')).toBe(true)
  })

  it('Contractor base config does NOT include govNotes', () => {
    const cfg = getSpreadsheetConfig('Contractor')
    expect(cfg.columns.some(c => c.key === 'govNotes')).toBe(false)
  })

  it('Shipbuilder cannot edit title or diNumber', () => {
    const cfg = getSpreadsheetConfig('Shipbuilder')
    const title = cfg.columns.find(c => c.key === 'title')
    const di = cfg.columns.find(c => c.key === 'diNumber')
    expect(title?.editable).toBe(false)
    expect(di?.editable).toBe(false)
  })

  it('Shipbuilder can edit actualSubmissionDate', () => {
    const cfg = getSpreadsheetConfig('Shipbuilder')
    const col = cfg.columns.find(c => c.key === 'actualSubmissionDate')
    expect(col?.editable).toBe(true)
  })
})

describe('CONTRACTOR_GRANTABLE_COLUMNS', () => {
  it('includes calendarDaysToReview', () => {
    expect(CONTRACTOR_GRANTABLE_COLUMNS).toContain('calendarDaysToReview')
  })

  it('includes govNotes', () => {
    expect(CONTRACTOR_GRANTABLE_COLUMNS).toContain('govNotes')
  })

  it('does not include title', () => {
    expect(CONTRACTOR_GRANTABLE_COLUMNS).not.toContain('title')
  })
})

describe('getContractorColumnsWithGrants', () => {
  it('returns base contractor columns when no grants', () => {
    const cols = getContractorColumnsWithGrants(new Set())
    const baseConfig = getSpreadsheetConfig('Contractor')
    expect(cols.length).toBe(baseConfig.columns.length)
  })

  it('adds govNotes column when granted', () => {
    const cols = getContractorColumnsWithGrants(new Set(['govNotes']))
    expect(cols.some(c => c.key === 'govNotes')).toBe(true)
  })

  it('marks granted govNotes as non-editable', () => {
    const cols = getContractorColumnsWithGrants(new Set(['govNotes']))
    const gov = cols.find(c => c.key === 'govNotes')
    expect(gov?.editable).toBe(false)
  })

  it('places govNotes before shipbuilderNotes', () => {
    const cols = getContractorColumnsWithGrants(new Set(['govNotes']))
    const govIdx = cols.findIndex(c => c.key === 'govNotes')
    const sbIdx = cols.findIndex(c => c.key === 'shipbuilderNotes')
    expect(govIdx).toBeLessThan(sbIdx)
  })
})
