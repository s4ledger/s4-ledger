import { useState, useRef, useCallback } from 'react'
import DraggableModal from './DraggableModal'
import { DocumentType, DocumentAttachment } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { uploadDocument, validateFile, analyzeDocument, formatFileSize } from '../services/documentService'

interface Props {
  rowId: string
  rowTitle: string
  diNumber: string
  onClose: () => void
  onUploaded: (doc: DocumentAttachment) => void
}

export default function DocumentUploadModal({ rowId, rowTitle, diNumber, onClose, onUploaded }: Props) {
  const { user, profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocumentType>('di_submittal')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [uploadedDoc, setUploadedDoc] = useState<DocumentAttachment | null>(null)

  const handleFile = useCallback((f: File) => {
    const err = validateFile(f)
    if (err) {
      setError(err)
      setFile(null)
      return
    }
    setError(null)
    setFile(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const doc = await uploadDocument({
        file,
        rowId,
        userId: user?.id,
        userEmail: user?.email,
        userRole: profile?.role,
        userOrg: profile?.organization,
        documentType: docType,
        notes: notes || undefined,
      })

      setUploadedDoc(doc)
      onUploaded(doc)

      // Auto-analyze with AI
      setAnalyzing(true)
      const analysis = await analyzeDocument(doc, file, diNumber, rowTitle)
      if (analysis) {
        doc.ai_analysis = analysis
        doc.ai_analyzed_at = new Date().toISOString()
        setUploadedDoc({ ...doc })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setAnalyzing(false)
    }
  }

  const fileIcon = file?.type.includes('pdf') ? 'fa-file-pdf text-red-500'
    : file?.type.includes('word') || file?.type.includes('document') ? 'fa-file-word text-blue-500'
    : file?.type.includes('sheet') || file?.type.includes('csv') ? 'fa-file-excel text-green-600'
    : file?.type.includes('image') ? 'fa-file-image text-purple-500'
    : 'fa-file text-steel'

  return (
    <DraggableModal className="bg-white border border-border rounded-card shadow-2xl" defaultWidth={540}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <i className="fas fa-cloud-upload-alt text-accent text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Upload Document</h3>
              <p className="text-[10px] text-steel">{rowId} — {rowTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-steel hover:text-gray-900 p-1">
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {!uploadedDoc ? (
          <>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver ? 'border-accent bg-accent/5 scale-[1.01]'
                : file ? 'border-green-300 bg-green-50/50'
                : 'border-border hover:border-accent/50 hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.zip,.7z,.gz"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <i className={`fas ${fileIcon} text-2xl`}></i>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 truncate max-w-[300px]">{file.name}</p>
                    <p className="text-[11px] text-steel">{formatFileSize(file.size)} · {file.type.split('/').pop()}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null) }}
                    className="text-steel hover:text-red-500 p-1"
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                </div>
              ) : (
                <>
                  <i className="fas fa-cloud-upload-alt text-3xl text-steel/30 mb-2"></i>
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Drag & drop a file or click to browse
                  </p>
                  <p className="text-[10px] text-steel">
                    PDF, DOCX, XLSX, CSV, PNG, JPEG, ZIP · Max 2 GB
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <i className="fas fa-exclamation-circle text-red-500 text-xs"></i>
                <p className="text-[11px] text-red-700">{error}</p>
              </div>
            )}

            {/* Document type & notes */}
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-steel uppercase tracking-wider mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={e => setDocType(e.target.value as DocumentType)}
                  className="w-full text-xs bg-white border border-border rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-accent"
                >
                  <option value="di_submittal">DI Submittal</option>
                  <option value="sow_reference">SOW Reference (Attachment J-2)</option>
                  <option value="correspondence">Correspondence</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-steel uppercase tracking-wider mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g., Preliminary revision 2, awaiting final review"
                  className="w-full text-xs bg-white border border-border rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                !file || uploading
                  ? 'bg-gray-100 text-steel cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent/90 shadow-sm'
              }`}
            >
              {uploading ? (
                <><i className="fas fa-spinner fa-spin"></i> Uploading…</>
              ) : (
                <><i className="fas fa-cloud-upload-alt"></i> Upload & Analyze</>
              )}
            </button>
          </>
        ) : (
          /* ── Upload complete + AI analysis ──────────────── */
          <div className="space-y-4">
            {/* Success banner */}
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center gap-3">
              <i className="fas fa-check-circle text-green-500 text-lg"></i>
              <div>
                <p className="text-xs font-bold text-green-800">Document uploaded successfully</p>
                <p className="text-[10px] text-green-700">{uploadedDoc.file_name} · {formatFileSize(uploadedDoc.file_size)}</p>
              </div>
            </div>

            {/* AI Analysis */}
            {analyzing ? (
              <div className="bg-accent/5 border border-accent/15 rounded-lg px-4 py-6 text-center">
                <i className="fas fa-brain text-accent text-xl mb-2 block animate-pulse"></i>
                <p className="text-xs font-semibold text-gray-700">AI analyzing document…</p>
                <p className="text-[10px] text-steel mt-1">Checking against {diNumber} completeness criteria</p>
              </div>
            ) : uploadedDoc.ai_analysis ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-border">
                  <i className="fas fa-brain text-accent text-xs"></i>
                  <span className="text-[11px] font-bold text-gray-900">AI Compliance Analysis</span>
                  <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    uploadedDoc.ai_analysis.compliance_score >= 80 ? 'bg-green-100 text-green-700'
                    : uploadedDoc.ai_analysis.compliance_score >= 50 ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                  }`}>
                    {uploadedDoc.ai_analysis.compliance_score}% Compliant
                  </span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs text-gray-700">{uploadedDoc.ai_analysis.summary}</p>

                  {uploadedDoc.ai_analysis.compliance_items.length > 0 && (
                    <div className="space-y-1.5">
                      {uploadedDoc.ai_analysis.compliance_items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <i className={`fas mt-0.5 text-[10px] ${
                            item.status === 'met' ? 'fa-check-circle text-green-500'
                            : item.status === 'partial' ? 'fa-exclamation-circle text-yellow-500'
                            : 'fa-times-circle text-red-500'
                          }`}></i>
                          <div>
                            <p className="text-[11px] font-medium text-gray-800">{item.requirement}</p>
                            <p className="text-[10px] text-steel">{item.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadedDoc.ai_analysis.recommendations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <p className="text-[10px] font-bold text-blue-800 mb-1">Recommendations</p>
                      {uploadedDoc.ai_analysis.recommendations.map((r, i) => (
                        <p key={i} className="text-[10px] text-blue-700">• {r}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-border rounded-lg px-4 py-3 text-center">
                <p className="text-[11px] text-steel">AI analysis unavailable for this file type</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </DraggableModal>
  )
}
