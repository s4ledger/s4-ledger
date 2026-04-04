import { useState, useEffect } from 'react'
import DraggableModal from './DraggableModal'
import { DocumentAttachment } from '../types'
import { getDocumentsForRow, getDocumentUrl, deleteDocument, formatFileSize } from '../services/documentService'

interface Props {
  rowId: string
  rowTitle: string
  diNumber: string
  onClose: () => void
  onUpload: () => void  // opens the upload modal
  refreshKey: number    // increment to trigger refresh
}

const FILE_ICONS: Record<string, string> = {
  'application/pdf': 'fa-file-pdf text-red-500',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word text-blue-500',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel text-green-600',
  'text/csv': 'fa-file-csv text-green-600',
  'image/png': 'fa-file-image text-purple-500',
  'image/jpeg': 'fa-file-image text-purple-500',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  di_submittal: 'DI Submittal',
  sow_reference: 'SOW Reference',
  correspondence: 'Correspondence',
  general: 'General',
}

export default function DocumentPanel({ rowId, rowTitle, diNumber, onClose, onUpload, refreshKey }: Props) {
  const [docs, setDocs] = useState<DocumentAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getDocumentsForRow(rowId).then(data => {
      if (!cancelled) {
        setDocs(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [rowId, refreshKey])

  async function handleDownload(doc: DocumentAttachment) {
    const url = await getDocumentUrl(doc)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      a.target = '_blank'
      a.click()
    }
  }

  async function handleDelete(doc: DocumentAttachment) {
    await deleteDocument(doc)
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={480}>
      <div className="flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <i className="fas fa-folder-open text-accent text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Documents</h3>
              <p className="text-[10px] text-steel">{rowId} — {diNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[11px] font-bold hover:bg-accent/90 transition-colors"
            >
              <i className="fas fa-plus text-[9px]"></i> Upload
            </button>
            <button onClick={onClose} className="text-steel hover:text-gray-900 p-1">
              <i className="fas fa-times text-sm"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-accent"></i>
              <p className="text-xs text-steel mt-2">Loading documents…</p>
            </div>
          ) : docs.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-folder-open text-steel/20 text-3xl mb-3 block"></i>
              <p className="text-xs font-semibold text-gray-700 mb-1">No documents attached</p>
              <p className="text-[10px] text-steel mb-4">Upload a DI submittal, SOW reference, or other file</p>
              <button
                onClick={onUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors"
              >
                <i className="fas fa-cloud-upload-alt"></i> Upload Document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map(doc => {
                const icon = FILE_ICONS[doc.file_type] || 'fa-file text-steel'
                const isExpanded = expanded === doc.id
                const analysis = doc.ai_analysis

                return (
                  <div key={doc.id} className="border border-border rounded-lg overflow-hidden">
                    {/* File header */}
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : doc.id)}
                    >
                      <i className={`fas ${icon} text-lg`}></i>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-steel">{formatFileSize(doc.file_size)}</span>
                          <span className="text-[9px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                          </span>
                          {analysis && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              analysis.compliance_score >= 80 ? 'bg-green-100 text-green-700'
                              : analysis.compliance_score >= 50 ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                            }`}>
                              {analysis.compliance_score}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); handleDownload(doc) }}
                          className="text-steel hover:text-accent p-1 transition-colors"
                          title="Download"
                        >
                          <i className="fas fa-download text-[11px]"></i>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(doc) }}
                          className="text-steel hover:text-red-500 p-1 transition-colors"
                          title="Delete"
                        >
                          <i className="fas fa-trash-alt text-[11px]"></i>
                        </button>
                        <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] text-steel ml-1`}></i>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-3 py-3 border-t border-border space-y-2">
                        {/* Upload info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-steel">
                          {doc.uploaded_by_email && (
                            <span><i className="fas fa-user mr-1"></i>{doc.uploaded_by_email.split('@')[0]}</span>
                          )}
                          {doc.uploaded_by_role && (
                            <span><i className="fas fa-id-badge mr-1"></i>{doc.uploaded_by_role}</span>
                          )}
                          <span><i className="fas fa-clock mr-1"></i>{new Date(doc.created_at).toLocaleString()}</span>
                        </div>

                        {doc.notes && (
                          <p className="text-[11px] text-gray-600 italic">{doc.notes}</p>
                        )}

                        {/* AI Analysis */}
                        {analysis && (
                          <div className="bg-accent/5 border border-accent/10 rounded-lg p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <i className="fas fa-brain text-accent text-xs"></i>
                              <span className="text-[11px] font-bold text-gray-900">AI Analysis</span>
                              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                analysis.compliance_score >= 80 ? 'bg-green-100 text-green-700'
                                : analysis.compliance_score >= 50 ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                              }`}>
                                {analysis.compliance_score}% Compliant
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-700">{analysis.summary}</p>

                            {analysis.compliance_items.length > 0 && (
                              <div className="space-y-1">
                                {analysis.compliance_items.map((item, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <i className={`fas mt-0.5 text-[9px] ${
                                      item.status === 'met' ? 'fa-check text-green-500'
                                      : item.status === 'partial' ? 'fa-minus text-yellow-500'
                                      : 'fa-times text-red-500'
                                    }`}></i>
                                    <span className="text-[10px] text-gray-700">{item.requirement}: {item.detail}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {analysis.recommendations.length > 0 && (
                              <div className="text-[10px] text-blue-700">
                                {analysis.recommendations.map((r, i) => (
                                  <p key={i}>• {r}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {docs.length > 0 && (
          <div className="px-5 py-3 border-t border-border bg-gray-50/50">
            <p className="text-[10px] text-steel text-center">
              <i className="fas fa-paperclip text-accent/60 mr-1"></i>
              {docs.length} document{docs.length !== 1 ? 's' : ''} attached · {rowTitle}
            </p>
          </div>
        )}
      </div>
    </DraggableModal>
  )
}
