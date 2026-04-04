/**
 * Document Service — upload, retrieve, and analyze documents attached to DRL rows.
 * Uses Supabase Storage for authenticated users; in-memory for demo mode.
 */

import { supabase } from '../lib/supabaseClient'
import { DocumentAttachment, DocumentType, AIDocAnalysis } from '../types'
import { chatWithAI } from '../utils/aiService'
import { contractRequirements } from '../data/contractData'

/* ── In-memory fallback for demo mode ─────────────────────── */
let memoryDocs: DocumentAttachment[] = []
let nextMemId = 1

/* ── File size formatting ─────────────────────────────────── */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/* ── Allowed file types ───────────────────────────────────── */
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/gzip',
]

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2 GB

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `Unsupported file type: ${file.type}. Supported: PDF, DOCX, XLSX, CSV, PNG, JPEG, ZIP, 7Z, GZ.`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${formatFileSize(file.size)}). Maximum: 2 GB.`
  }
  return null
}

/* ── Extract text from file (client-side) ─────────────────── */
async function extractText(file: File): Promise<string> {
  // CSV / plain text
  if (file.type === 'text/csv' || file.type.startsWith('text/')) {
    const text = await file.text()
    return text.slice(0, 8000)
  }

  // For PDF / DOCX / XLSX — extract what we can from the file name and metadata
  // Full parsing would require heavyweight libs; we send metadata + AI infers
  return `[File: ${file.name}, Type: ${file.type}, Size: ${formatFileSize(file.size)}]`
}

/* ── Upload a document ────────────────────────────────────── */
export async function uploadDocument(params: {
  file: File
  rowId: string
  userId?: string | null
  userEmail?: string | null
  userRole?: string | null
  userOrg?: string | null
  documentType: DocumentType
  notes?: string
}): Promise<DocumentAttachment> {
  const { file, rowId, userId, userEmail, userRole, userOrg, documentType, notes } = params

  // Try Supabase Storage upload for authenticated users
  let storagePath: string | null = null
  let blobUrl: string | undefined

  if (userId) {
    const path = `${rowId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadError } = await supabase.storage
      .from('drl-documents')
      .upload(path, file, { contentType: file.type })

    if (!uploadError) {
      storagePath = path
    }
  }

  // For demo mode or if storage upload failed, create a blob URL
  if (!storagePath) {
    blobUrl = URL.createObjectURL(file)
  }

  const doc: DocumentAttachment = {
    id: `mem-${nextMemId++}`,
    row_id: rowId,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: storagePath,
    blob_url: blobUrl,
    uploaded_by_email: userEmail || null,
    uploaded_by_role: userRole || null,
    uploaded_by_org: userOrg || null,
    ai_analysis: null,
    ai_analyzed_at: null,
    notes: notes || null,
    document_type: documentType,
    created_at: new Date().toISOString(),
  }

  // Persist metadata to Supabase
  if (userId) {
    try {
      const { data, error } = await supabase.from('drl_documents').insert({
        row_id: rowId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        uploaded_by: userId,
        uploaded_by_email: userEmail,
        uploaded_by_role: userRole,
        uploaded_by_org: userOrg,
        notes: notes || null,
        document_type: documentType,
      }).select().single()

      if (!error && data) {
        doc.id = data.id
      }
    } catch {
      // Supabase unavailable — in-memory fallback
    }
  }

  memoryDocs.push(doc)
  return doc
}

/* ── Get documents for a DRL row ──────────────────────────── */
export async function getDocumentsForRow(rowId: string): Promise<DocumentAttachment[]> {
  try {
    const { data, error } = await supabase
      .from('drl_documents')
      .select('*')
      .eq('row_id', rowId)
      .order('created_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return data as DocumentAttachment[]
    }
  } catch {
    // Fall through to memory
  }

  return memoryDocs
    .filter(d => d.row_id === rowId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

/* ── Get document counts per row (for badge display) ──────── */
export function getDocumentCountsSync(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const doc of memoryDocs) {
    counts[doc.row_id] = (counts[doc.row_id] || 0) + 1
  }
  return counts
}

export async function getDocumentCounts(): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('drl_documents')
      .select('row_id')

    if (!error && data && data.length > 0) {
      const counts: Record<string, number> = {}
      for (const d of data) {
        counts[d.row_id] = (counts[d.row_id] || 0) + 1
      }
      return counts
    }
  } catch {
    // Fall through
  }

  return getDocumentCountsSync()
}

/* ── Get download URL for a document ──────────────────────── */
export async function getDocumentUrl(doc: DocumentAttachment): Promise<string | null> {
  if (doc.blob_url) return doc.blob_url

  if (doc.storage_path) {
    const { data } = await supabase.storage
      .from('drl-documents')
      .createSignedUrl(doc.storage_path, 3600) // 1 hour expiry
    return data?.signedUrl || null
  }

  return null
}

/* ── AI Document Analysis ─────────────────────────────────── */
export async function analyzeDocument(
  doc: DocumentAttachment,
  file: File,
  diNumber: string,
  rowTitle: string,
): Promise<AIDocAnalysis | null> {
  // Extract what text we can from the file
  const extractedText = await extractText(file)

  // Look up contract requirements for this DRL row
  const reqKey = Object.keys(contractRequirements).find(k =>
    contractRequirements[k].diNumber === diNumber
  )
  const requirement = reqKey ? contractRequirements[reqKey] : null

  const completenessStr = requirement?.completenessCriteria
    ? requirement.completenessCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : 'No specific completeness criteria defined for this DI.'

  const prompt = `Analyze this document submission for DRL compliance.

**DRL Row:** ${doc.row_id} — ${rowTitle}
**DI Number:** ${diNumber}
**Document:** ${doc.file_name} (${doc.file_type}, ${formatFileSize(doc.file_size)})
**Document Type:** ${doc.document_type}
**Extracted Content Preview:**
${extractedText}

**Completeness Criteria for this DI:**
${completenessStr}

${requirement ? `**Contract Reference:** ${requirement.contractRef}
**Required Version:** ${requirement.requiredVersion}
**Submittal Method:** ${requirement.submittalMethod}` : ''}

Please provide a JSON analysis with this exact structure:
{
  "summary": "Brief 1-2 sentence assessment of the document",
  "compliance_items": [
    {"requirement": "requirement text", "status": "met|partial|missing", "detail": "explanation"}
  ],
  "compliance_score": 0-100,
  "recommendations": ["suggestion 1", "suggestion 2"],
  "extracted_text_preview": "first ~200 chars of relevant content"
}

Respond ONLY with the JSON object, no markdown formatting.`

  try {
    const response = await chatWithAI({
      message: prompt,
      tool_context: 'document_analysis',
      analysis_data: {
        file_name: doc.file_name,
        file_type: doc.file_type,
        file_size: doc.file_size,
        di_number: diNumber,
        row_title: rowTitle,
        document_type: doc.document_type,
        completeness_criteria: requirement?.completenessCriteria || [],
      },
    })

    // Parse the AI response as JSON
    const text = response.response.trim()
    // Try to extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const analysis = JSON.parse(jsonMatch[0]) as AIDocAnalysis

    // Persist analysis to Supabase
    if (doc.id && !doc.id.startsWith('mem-')) {
      try {
        await supabase.from('drl_documents').update({
          ai_analysis: analysis,
          ai_analyzed_at: new Date().toISOString(),
        }).eq('id', doc.id)
      } catch { /* ignore */ }
    }

    // Update in-memory record
    const memDoc = memoryDocs.find(d => d.id === doc.id)
    if (memDoc) {
      memDoc.ai_analysis = analysis
      memDoc.ai_analyzed_at = new Date().toISOString()
    }

    return analysis
  } catch {
    return null
  }
}

/* ── Delete a document ────────────────────────────────────── */
export async function deleteDocument(doc: DocumentAttachment): Promise<boolean> {
  // Remove from Supabase Storage
  if (doc.storage_path) {
    await supabase.storage.from('drl-documents').remove([doc.storage_path])
  }

  // Remove metadata from Supabase
  if (doc.id && !doc.id.startsWith('mem-')) {
    await supabase.from('drl_documents').delete().eq('id', doc.id)
  }

  // Remove from memory
  memoryDocs = memoryDocs.filter(d => d.id !== doc.id)

  // Revoke blob URL if it exists
  if (doc.blob_url) {
    URL.revokeObjectURL(doc.blob_url)
  }

  return true
}
