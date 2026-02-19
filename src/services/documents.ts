import { getSupabaseClient } from './supabase';

// Max chars per chunk (~4000 tokens ≈ 16000 chars, leave room for prompt)
const CHUNK_SIZE = 12000;

export interface Document {
    id: string;
    title: string;
    file_type: string;
    file_size: number;
    content: string;
    chunk_count: number;
    tags: string[];
    folder: string;
    created_at: string;
}

export interface DocumentChunk {
    id: string;
    document_id: string;
    chunk_index: number;
    content: string;
    char_count: number;
}

// ========== TEXT EXTRACTION ==========

export const extractTextFromPDF = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker path
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += `\n--- Trang ${i} ---\n${pageText}`;
    }

    return fullText.trim();
};

export const extractTextFromDocx = async (file: File): Promise<string> => {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
};

export const extractTextFromTxt = async (file: File): Promise<string> => {
    return await file.text();
};

export const extractText = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf':
            return extractTextFromPDF(file);
        case 'docx':
        case 'doc':
            return extractTextFromDocx(file);
        case 'txt':
        case 'md':
            return extractTextFromTxt(file);
        default:
            throw new Error(`Không hỗ trợ file .${ext}. Chỉ hỗ trợ PDF, DOCX, TXT.`);
    }
};

// ========== CHUNKING ==========

const splitIntoChunks = (text: string): string[] => {
    if (text.length <= CHUNK_SIZE) return [text];

    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = start + CHUNK_SIZE;
        // Try to break at paragraph or sentence boundary
        if (end < text.length) {
            const lastNewline = text.lastIndexOf('\n', end);
            const lastPeriod = text.lastIndexOf('. ', end);
            if (lastNewline > start + CHUNK_SIZE / 2) {
                end = lastNewline + 1;
            } else if (lastPeriod > start + CHUNK_SIZE / 2) {
                end = lastPeriod + 2;
            }
        }
        chunks.push(text.slice(start, end));
        start = end;
    }
    return chunks;
};

// ========== SUPABASE CRUD ==========

export const saveDocument = async (title: string, content: string, fileType: string, fileSize: number, tags: string[] = [], folder: string = ''): Promise<Document | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        return saveDocumentLocal(title, content, fileType, fileSize, tags, folder);
    }

    const chunks = splitIntoChunks(content);

    // Save main document
    const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
            title,
            file_type: fileType,
            file_size: fileSize,
            content: content.substring(0, 50000),
            chunk_count: chunks.length,
            tags,
            folder,
        })
        .select()
        .single();

    if (docError) {
        console.error('Error saving document:', docError);
        return saveDocumentLocal(title, content, fileType, fileSize, tags, folder);
    }

    // Save chunks
    if (chunks.length > 0) {
        const chunkRecords = chunks.map((chunk, i) => ({
            document_id: doc.id,
            chunk_index: i,
            content: chunk,
            char_count: chunk.length,
        }));

        const { error: chunkError } = await supabase
            .from('document_chunks')
            .insert(chunkRecords);

        if (chunkError) {
            console.warn('Error saving chunks:', chunkError);
        }
    }

    return doc as Document;
};

export const getDocuments = async (): Promise<Document[]> => {
    const supabase = getSupabaseClient();
    if (!supabase) return getDocumentsLocal();

    const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_type, file_size, chunk_count, tags, folder, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching documents:', error);
        return getDocumentsLocal();
    }

    return (data || []) as Document[];
};

export const getDocumentContent = async (docId: string): Promise<string> => {
    const supabase = getSupabaseClient();
    if (!supabase) return getDocumentContentLocal(docId);

    // Get chunks in order
    const { data: chunks, error } = await supabase
        .from('document_chunks')
        .select('content, chunk_index')
        .eq('document_id', docId)
        .order('chunk_index', { ascending: true });

    if (error || !chunks || chunks.length === 0) {
        // Fallback: get from main document
        const { data: doc } = await supabase
            .from('documents')
            .select('content')
            .eq('id', docId)
            .single();
        return doc?.content || '';
    }

    return chunks.map(c => c.content).join('');
};

export const deleteDocument = async (docId: string): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        deleteDocumentLocal(docId);
        return true;
    }

    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

    if (error) {
        console.error('Error deleting document:', error);
        return false;
    }
    return true;
};

export const updateDocumentTags = async (docId: string, tags: string[]): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        const docs = getLocalDocs();
        const doc = docs.find(d => d.id === docId);
        if (doc) { doc.tags = tags; setLocalDocs(docs); }
        return true;
    }
    const { error } = await supabase.from('documents').update({ tags }).eq('id', docId);
    return !error;
};

export const updateDocumentFolder = async (docId: string, folder: string): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        const docs = getLocalDocs();
        const doc = docs.find(d => d.id === docId);
        if (doc) { doc.folder = folder; setLocalDocs(docs); }
        return true;
    }
    const { error } = await supabase.from('documents').update({ folder }).eq('id', docId);
    return !error;
};

// ========== LOCAL STORAGE FALLBACK ==========

const LOCAL_KEY = 'chatbot_documents';

interface LocalDoc {
    id: string;
    title: string;
    file_type: string;
    file_size: number;
    content: string;
    chunk_count: number;
    tags: string[];
    folder: string;
    created_at: string;
}

const getLocalDocs = (): LocalDoc[] => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {
        return [];
    }
};

const setLocalDocs = (docs: LocalDoc[]) => {
    try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(docs));
    } catch (e) {
        console.error('localStorage full:', e);
    }
};

const saveDocumentLocal = (title: string, content: string, fileType: string, fileSize: number, tags: string[], folder: string): Document => {
    const doc: LocalDoc = {
        id: crypto.randomUUID(),
        title,
        file_type: fileType,
        file_size: fileSize,
        content: content.substring(0, 100000),
        chunk_count: Math.ceil(content.length / CHUNK_SIZE),
        tags,
        folder,
        created_at: new Date().toISOString(),
    };
    const docs = getLocalDocs();
    docs.unshift(doc);
    setLocalDocs(docs);
    return doc;
};

const getDocumentsLocal = (): Document[] => {
    return getLocalDocs().map(d => ({ ...d, content: '' })); // Don't return full content in list
};

const getDocumentContentLocal = (docId: string): string => {
    const docs = getLocalDocs();
    return docs.find(d => d.id === docId)?.content || '';
};

const deleteDocumentLocal = (docId: string) => {
    const docs = getLocalDocs().filter(d => d.id !== docId);
    setLocalDocs(docs);
};

// ========== CONTEXT BUILDER FOR CHAT ==========

export const buildDocumentContext = async (selectedDocIds: string[]): Promise<string> => {
    if (selectedDocIds.length === 0) return '';

    const contents: string[] = [];
    for (const id of selectedDocIds) {
        const content = await getDocumentContent(id);
        if (content) {
            // Limit each doc to ~8000 chars to fit in context
            contents.push(content.substring(0, 8000));
        }
    }

    if (contents.length === 0) return '';

    return `\n\nTÀI LIỆU THAM KHẢO:\n${contents.map((c, i) => `--- Tài liệu ${i + 1} ---\n${c}`).join('\n\n')}`;
};
