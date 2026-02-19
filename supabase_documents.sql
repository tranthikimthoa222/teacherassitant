-- =====================================================
-- Bảng lưu trữ tài liệu cho Chatbot GV
-- Chạy script này trong SQL Editor của Supabase
-- =====================================================

-- Tạo bảng documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt'
  file_size INTEGER DEFAULT 0, -- bytes
  content TEXT NOT NULL, -- extracted text content
  chunk_count INTEGER DEFAULT 1,
  tags TEXT[] DEFAULT '{}',
  folder TEXT DEFAULT '', -- folder/category name
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tạo bảng document_chunks để chia nhỏ tài liệu lớn
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  char_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- RLS (tắt nếu chưa cần auth)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Policy cho phép tất cả (vì app chưa có auth)
CREATE POLICY "Allow all on documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on document_chunks" ON document_chunks FOR ALL USING (true) WITH CHECK (true);
