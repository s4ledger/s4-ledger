-- Enhancement #21: Document storage for DRL attachments
-- Supports file uploads linked to DRL rows with AI analysis results

-- ── Documents metadata table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.drl_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  row_id TEXT NOT NULL,                          -- DRL row ID (e.g. 'DRL-001')
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,                       -- MIME type
  file_size BIGINT NOT NULL,                     -- bytes
  storage_path TEXT,                             -- Supabase Storage path (null for demo)
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_email TEXT,
  uploaded_by_role TEXT,
  uploaded_by_org TEXT,
  ai_analysis JSONB,                             -- AI compliance analysis results
  ai_analyzed_at TIMESTAMPTZ,
  notes TEXT,                                    -- User notes about the document
  document_type TEXT DEFAULT 'general',          -- 'di_submittal' | 'sow_reference' | 'correspondence' | 'general'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drl_documents_row_id ON public.drl_documents(row_id);
CREATE INDEX IF NOT EXISTS idx_drl_documents_uploaded_by ON public.drl_documents(uploaded_by);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.drl_documents ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all documents
CREATE POLICY "Authenticated users can read drl_documents"
  ON public.drl_documents FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert their own documents
CREATE POLICY "Users can upload drl_documents"
  ON public.drl_documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Authenticated users can update their own documents (e.g. AI analysis results)
CREATE POLICY "Users can update own drl_documents"
  ON public.drl_documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Authenticated users can delete their own documents
CREATE POLICY "Users can delete own drl_documents"
  ON public.drl_documents FOR DELETE
  TO authenticated
  USING (auth.uid() = uploaded_by);

-- Demo mode: allow anonymous inserts/reads when uploaded_by is NULL
CREATE POLICY "Demo mode drl_document insert"
  ON public.drl_documents FOR INSERT
  TO anon
  WITH CHECK (uploaded_by IS NULL);

CREATE POLICY "Demo mode drl_document read"
  ON public.drl_documents FOR SELECT
  TO anon
  USING (uploaded_by IS NULL);

-- ── Supabase Storage bucket ──────────────────────────────────
-- Note: Create the storage bucket via Supabase Dashboard > Storage:
--   Bucket name: drl-documents
--   Public: false (private)
--   File size limit: 50MB
--   Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document,
--     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, image/png, image/jpeg,
--     application/zip, application/x-zip-compressed, application/x-7z-compressed, application/gzip
--
-- Then apply these storage policies:
-- INSERT: (auth.role() = 'authenticated')
-- SELECT: (auth.role() = 'authenticated')
-- DELETE: (auth.role() = 'authenticated')
