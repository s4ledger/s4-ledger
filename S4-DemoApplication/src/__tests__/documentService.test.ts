/**
 * ═══════════════════════════════════════════════════════════════
 *  Document Service Tests — formatFileSize, validateFile
 * ═══════════════════════════════════════════════════════════════
 */
import { describe, it, expect } from 'vitest'
import { formatFileSize, validateFile } from '../services/documentService'

describe('formatFileSize', () => {
  it('formats bytes (< 1 KB)', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(2560)).toBe('2.5 KB')
    expect(formatFileSize(1024 * 500)).toBe('500.0 KB')
  })

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
    expect(formatFileSize(1024 * 1024 * 5)).toBe('5.0 MB')
    expect(formatFileSize(1024 * 1024 * 50)).toBe('50.0 MB')
  })
})

describe('validateFile', () => {
  function makeFile(name: string, type: string, size: number): File {
    const buffer = new ArrayBuffer(size > 0 ? Math.min(size, 8) : 0) // small buffer
    const file = new File([buffer], name, { type })
    // Override size since File constructor uses buffer length
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  it('accepts valid PDF files', () => {
    expect(validateFile(makeFile('doc.pdf', 'application/pdf', 1024))).toBeNull()
  })

  it('accepts valid DOCX files', () => {
    expect(validateFile(makeFile(
      'report.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      2048
    ))).toBeNull()
  })

  it('accepts valid XLSX files', () => {
    expect(validateFile(makeFile(
      'data.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      4096
    ))).toBeNull()
  })

  it('accepts CSV files', () => {
    expect(validateFile(makeFile('data.csv', 'text/csv', 512))).toBeNull()
  })

  it('accepts image files (PNG, JPEG)', () => {
    expect(validateFile(makeFile('photo.png', 'image/png', 1024))).toBeNull()
    expect(validateFile(makeFile('photo.jpg', 'image/jpeg', 1024))).toBeNull()
  })

  it('accepts archive files (ZIP, 7Z, GZ)', () => {
    expect(validateFile(makeFile('archive.zip', 'application/zip', 1024))).toBeNull()
    expect(validateFile(makeFile('archive.7z', 'application/x-7z-compressed', 1024))).toBeNull()
    expect(validateFile(makeFile('archive.gz', 'application/gzip', 1024))).toBeNull()
  })

  it('rejects unsupported file types', () => {
    const result = validateFile(makeFile('script.exe', 'application/x-executable', 1024))
    expect(result).toContain('Unsupported file type')
  })

  it('rejects files over 50 MB', () => {
    const oversize = 51 * 1024 * 1024
    const result = validateFile(makeFile('huge.pdf', 'application/pdf', oversize))
    expect(result).toContain('too large')
    expect(result).toContain('50 MB')
  })

  it('accepts files exactly at 50 MB', () => {
    const exact = 50 * 1024 * 1024
    expect(validateFile(makeFile('borderline.pdf', 'application/pdf', exact))).toBeNull()
  })
})
