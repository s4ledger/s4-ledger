import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CDRLRow, AnchorRecord, UserRole } from '../types'

export function generatePDF(
  data: CDRLRow[],
  anchors: Record<string, AnchorRecord>,
  role: UserRole,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const now = new Date()

  // Header
  doc.setFillColor(0, 122, 255)
  doc.rect(0, 0, 297, 25, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('S4 Ledger — Deliverables Status Report', 14, 14)
  doc.setFontSize(8)
  doc.setTextColor(139, 143, 163)
  doc.text(`Generated: ${now.toLocaleString()} | Role: ${role} | FOUO Simulation`, 14, 20)

  // Summary stats
  const green = data.filter(r => r.status === 'green').length
  const yellow = data.filter(r => r.status === 'yellow').length
  const red = data.filter(r => r.status === 'red').length
  const anchoredCount = Object.keys(anchors).length

  doc.setTextColor(50, 50, 50)
  doc.setFontSize(10)
  doc.text(`Total: ${data.length}  |  Approved: ${green}  |  In Review: ${yellow}  |  Overdue: ${red}  |  Sealed: ${anchoredCount}`, 14, 33)

  // Table
  const tableData = data.map(row => [
    row.id,
    row.title,
    row.diNumber,
    row.contractDueFinish,
    row.calculatedDueDate,
    row.actualSubmissionDate || '—',
    row.received,
    row.calendarDaysToReview !== null ? String(row.calendarDaysToReview) : '—',
    anchors[row.id] ? 'Verified' : '—',
    row.notes,
  ])

  autoTable(doc, {
    startY: 38,
    head: [[
      'ID', 'Title', 'DI Number', 'Due: Finish', 'Calc Due', 'Submitted', 'RCVD', 'Days', 'Trust', 'Notes'
    ]],
    body: tableData,
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [0, 122, 255],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
    },
    bodyStyles: {
      textColor: [50, 50, 50],
    },
    didParseCell(hookData) {
      if (hookData.section === 'body') {
        const rowIdx = hookData.row.index
        const status = data[rowIdx]?.status
        if (status === 'red') {
          hookData.cell.styles.fillColor = [255, 235, 235]
        } else if (status === 'yellow') {
          hookData.cell.styles.fillColor = [255, 249, 230]
        } else if (status === 'green') {
          hookData.cell.styles.fillColor = [235, 255, 240]
        }
      }
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 50 },
      2: { cellWidth: 28 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 12 },
      7: { cellWidth: 12 },
      8: { cellWidth: 16 },
      9: { cellWidth: 60 },
    },
    margin: { left: 14, right: 14 },
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(139, 143, 163)
    doc.text(
      `S4 Ledger · FOUO Simulation · Page ${i} of ${pageCount}`,
      297 / 2,
      205,
      { align: 'center' }
    )
  }

  doc.save(`S4_Deliverables_Report_${now.toISOString().slice(0, 10)}.pdf`)
}
