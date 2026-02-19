
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Upload, Trash2, Check, Loader2, AlertCircle, File, FolderPlus, Tag, CheckSquare, Square, ChevronRight, FolderOpen, Plus } from 'lucide-react';
import { extractText, saveDocument, getDocuments, deleteDocument, updateDocumentTags, updateDocumentFolder } from '../services/documents';
import type { Document } from '../services/documents';

interface DocumentManagerProps {
    isOpen: boolean;
    onClose: () => void;
    selectedDocIds: string[];
    onSelectionChange: (ids: string[]) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
    isOpen, onClose, selectedDocIds, onSelectionChange
}) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState('');
    const [dragOver, setDragOver] = useState(false);

    // Folder & Tag states
    const [activeFolder, setActiveFolder] = useState<string | null>(null); // null = "Tất cả"
    const [showNewFolder, setShowNewFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [showTagInput, setShowTagInput] = useState<string | null>(null); // doc id
    const [newTag, setNewTag] = useState('');
    const [uploadFolder, setUploadFolder] = useState(''); // folder for new uploads

    const loadDocuments = useCallback(async () => {
        const docs = await getDocuments();
        setDocuments(docs);
    }, []);

    useEffect(() => {
        if (isOpen) loadDocuments();
    }, [isOpen, loadDocuments]);

    // Derive folders from documents
    const folders = useMemo(() => {
        const folderSet = new Set<string>();
        documents.forEach(d => { if (d.folder) folderSet.add(d.folder); });
        return Array.from(folderSet).sort();
    }, [documents]);

    // Filter documents by active folder
    const filteredDocs = useMemo(() => {
        if (activeFolder === null) return documents;
        return documents.filter(d => d.folder === activeFolder);
    }, [documents, activeFolder]);

    // All unique tags
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        documents.forEach(d => d.tags?.forEach(t => tagSet.add(t)));
        return Array.from(tagSet).sort();
    }, [documents]);

    // ========== HANDLERS ==========

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploading(true);
        setError('');

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                setUploadProgress(`Đang xử lý: ${file.name} (${i + 1}/${files.length})...`);
                const text = await extractText(file);
                if (!text || text.trim().length < 10) {
                    setError(`File "${file.name}" không có nội dung text.`);
                    continue;
                }
                const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
                setUploadProgress(`Đang lưu: ${file.name}...`);
                await saveDocument(file.name.replace(/\.\w+$/, ''), text, ext, file.size, [], uploadFolder);
            } catch (err: any) {
                setError(`Lỗi "${file.name}": ${err.message}`);
            }
        }
        setUploadProgress('');
        setUploading(false);
        await loadDocuments();
    };

    const handleDelete = async (docId: string) => {
        if (!confirm('Xóa tài liệu này?')) return;
        await deleteDocument(docId);
        onSelectionChange(selectedDocIds.filter(id => id !== docId));
        await loadDocuments();
    };

    const toggleSelect = (docId: string) => {
        if (selectedDocIds.includes(docId)) {
            onSelectionChange(selectedDocIds.filter(id => id !== docId));
        } else {
            onSelectionChange([...selectedDocIds, docId]);
        }
    };

    // SELECT ALL / DESELECT ALL
    const handleSelectAll = () => {
        const filteredIds = filteredDocs.map(d => d.id);
        const allSelected = filteredIds.every(id => selectedDocIds.includes(id));
        if (allSelected) {
            // Deselect all filtered
            onSelectionChange(selectedDocIds.filter(id => !filteredIds.includes(id)));
        } else {
            // Select all filtered (merge with existing)
            const merged = new Set([...selectedDocIds, ...filteredIds]);
            onSelectionChange(Array.from(merged));
        }
    };

    // ADD FOLDER
    const handleCreateFolder = () => {
        if (!newFolderName.trim()) return;
        setActiveFolder(newFolderName.trim());
        setUploadFolder(newFolderName.trim());
        setNewFolderName('');
        setShowNewFolder(false);
    };

    // MOVE TO FOLDER
    const handleMoveToFolder = async (docId: string, folder: string) => {
        await updateDocumentFolder(docId, folder);
        await loadDocuments();
    };

    // ADD TAG
    const handleAddTag = async (docId: string) => {
        if (!newTag.trim()) return;
        const doc = documents.find(d => d.id === docId);
        const tags = [...(doc?.tags || []), newTag.trim()];
        await updateDocumentTags(docId, tags);
        setNewTag('');
        setShowTagInput(null);
        await loadDocuments();
    };

    // REMOVE TAG
    const handleRemoveTag = async (docId: string, tag: string) => {
        const doc = documents.find(d => d.id === docId);
        const tags = (doc?.tags || []).filter(t => t !== tag);
        await updateDocumentTags(docId, tags);
        await loadDocuments();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFileUpload(e.dataTransfer.files);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'pdf': return '📄';
            case 'docx': case 'doc': return '📝';
            default: return '📃';
        }
    };

    if (!isOpen) return null;

    const allFilteredSelected = filteredDocs.length > 0 && filteredDocs.every(d => selectedDocIds.includes(d.id));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">📚 Tài liệu tham khảo</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Upload & quản lý tài liệu theo thư mục</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    {/* === LEFT: FOLDER SIDEBAR === */}
                    <div className="w-48 border-r border-gray-200 bg-gray-50 p-3 flex flex-col shrink-0 overflow-y-auto">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Thư mục</p>

                        {/* All documents */}
                        <button
                            onClick={() => { setActiveFolder(null); setUploadFolder(''); }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg mb-1 transition-all w-full text-left ${activeFolder === null ? 'bg-teal-100 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <FolderOpen size={15} />
                            Tất cả ({documents.length})
                        </button>

                        {/* Folder list */}
                        {folders.map(folder => {
                            const count = documents.filter(d => d.folder === folder).length;
                            return (
                                <button
                                    key={folder}
                                    onClick={() => { setActiveFolder(folder); setUploadFolder(folder); }}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg mb-1 transition-all w-full text-left ${activeFolder === folder ? 'bg-teal-100 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <ChevronRight size={13} />
                                    <span className="truncate flex-1">{folder}</span>
                                    <span className="text-[10px] text-gray-400">{count}</span>
                                </button>
                            );
                        })}

                        {/* Uncategorized */}
                        {documents.some(d => !d.folder) && (
                            <button
                                onClick={() => { setActiveFolder(''); setUploadFolder(''); }}
                                className={`flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-lg mb-1 transition-all w-full text-left ${activeFolder === '' ? 'bg-teal-100 text-teal-700 font-medium' : 'text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                <File size={13} />
                                <span className="truncate flex-1 italic">Chưa phân loại</span>
                                <span className="text-[10px] text-gray-400">{documents.filter(d => !d.folder).length}</span>
                            </button>
                        )}

                        {/* New folder button */}
                        {showNewFolder ? (
                            <div className="mt-2 space-y-1">
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                                    placeholder="Tên thư mục..."
                                    className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-teal-500"
                                    autoFocus
                                />
                                <div className="flex gap-1">
                                    <button onClick={handleCreateFolder} className="flex-1 px-2 py-1 text-xs bg-teal-600 text-white rounded-md">Tạo</button>
                                    <button onClick={() => setShowNewFolder(false)} className="flex-1 px-2 py-1 text-xs bg-gray-200 rounded-md">Hủy</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowNewFolder(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 mt-2 text-xs text-teal-600 hover:bg-teal-50 rounded-lg transition-colors w-full"
                            >
                                <FolderPlus size={13} />
                                Thêm thư mục
                            </button>
                        )}

                        {/* All Tags */}
                        {allTags.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-200">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Chủ đề</p>
                                <div className="flex flex-wrap gap-1">
                                    {allTags.map(tag => (
                                        <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* === RIGHT: MAIN CONTENT === */}
                    <div className="flex-1 flex flex-col overflow-hidden">

                        {/* Upload Area */}
                        <div className="p-3 border-b border-gray-100 shrink-0">
                            <label
                                className={`flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${dragOver ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
                                    }`}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 size={24} className="text-teal-600 animate-spin mb-1" />
                                        <p className="text-xs text-teal-600 font-medium">{uploadProgress}</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={24} className="text-gray-400 mb-1" />
                                        <p className="text-xs text-gray-600 font-medium">Kéo thả hoặc nhấn chọn file</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">PDF, DOCX, TXT
                                            {uploadFolder && <span className="text-teal-600"> → {uploadFolder}</span>}
                                        </p>
                                    </>
                                )}
                                <input type="file" multiple accept=".pdf,.docx,.doc,.txt,.md" className="hidden"
                                    onChange={(e) => handleFileUpload(e.target.files)} disabled={uploading} />
                            </label>
                            {error && (
                                <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-red-600">{error}</p>
                                </div>
                            )}
                        </div>

                        {/* Toolbar */}
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 shrink-0">
                            <button
                                onClick={handleSelectAll}
                                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${allFilteredSelected
                                    ? 'bg-teal-100 text-teal-700'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {allFilteredSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                {allFilteredSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>

                            <div className="flex-1" />

                            <span className="text-[11px] text-gray-400">
                                {filteredDocs.length} tài liệu · {selectedDocIds.length} đang chọn
                            </span>
                        </div>

                        {/* Document List */}
                        <div className="flex-1 overflow-y-auto p-3">
                            {filteredDocs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <File size={40} className="text-gray-300 mb-2" />
                                    <p className="text-gray-500 font-medium text-sm">
                                        {activeFolder !== null ? `Thư mục "${activeFolder || 'Chưa phân loại'}" trống` : 'Chưa có tài liệu nào'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Upload tài liệu để chatbot tham khảo</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredDocs.map(doc => {
                                        const isSelected = selectedDocIds.includes(doc.id);
                                        return (
                                            <div key={doc.id} className={`rounded-xl border-2 transition-all ${isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}>
                                                {/* Main row */}
                                                <div className="flex items-center gap-2.5 p-3 cursor-pointer" onClick={() => toggleSelect(doc.id)}>
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all ${isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                                                        }`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <span className="text-lg">{getFileIcon(doc.file_type)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-gray-900 text-sm truncate">{doc.title}</p>
                                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                                            {doc.file_type.toUpperCase()} · {formatSize(doc.file_size)}
                                                            {doc.folder && <span className="text-teal-500"> · 📁 {doc.folder}</span>}
                                                        </p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        {/* Move to folder */}
                                                        <select
                                                            value={doc.folder || ''}
                                                            onChange={(e) => handleMoveToFolder(doc.id, e.target.value)}
                                                            className="text-[10px] px-1.5 py-1 border border-gray-200 rounded-md bg-white text-gray-500 cursor-pointer"
                                                            title="Di chuyển đến thư mục"
                                                        >
                                                            <option value="">📁 --</option>
                                                            {folders.map(f => <option key={f} value={f}>{f}</option>)}
                                                        </select>

                                                        {/* Add tag */}
                                                        <button
                                                            onClick={() => setShowTagInput(showTagInput === doc.id ? null : doc.id)}
                                                            className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                                                            title="Thêm chủ đề"
                                                        >
                                                            <Tag size={13} />
                                                        </button>

                                                        {/* Delete */}
                                                        <button
                                                            onClick={() => handleDelete(doc.id)}
                                                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Tags row */}
                                                {(doc.tags?.length > 0 || showTagInput === doc.id) && (
                                                    <div className="px-3 pb-2 flex flex-wrap items-center gap-1 ml-8">
                                                        {doc.tags?.map(tag => (
                                                            <span key={tag} className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-full font-medium group">
                                                                {tag}
                                                                <button onClick={() => handleRemoveTag(doc.id, tag)} className="ml-0.5 text-amber-400 hover:text-red-500">×</button>
                                                            </span>
                                                        ))}
                                                        {showTagInput === doc.id && (
                                                            <div className="inline-flex items-center gap-1">
                                                                <input
                                                                    type="text"
                                                                    value={newTag}
                                                                    onChange={(e) => setNewTag(e.target.value)}
                                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag(doc.id)}
                                                                    placeholder="Chủ đề..."
                                                                    className="w-20 px-1.5 py-0.5 text-[10px] border border-amber-300 rounded-md focus:ring-1 focus:ring-amber-400"
                                                                    autoFocus
                                                                />
                                                                <button onClick={() => handleAddTag(doc.id)} className="p-0.5 bg-amber-500 text-white rounded">
                                                                    <Plus size={10} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex justify-between items-center shrink-0">
                    {selectedDocIds.length > 0 && (
                        <p className="text-xs text-teal-600 font-medium">
                            ✅ {selectedDocIds.length} tài liệu sẽ được chatbot tham khảo
                        </p>
                    )}
                    <div className="flex-1" />
                    <button onClick={onClose} className="px-5 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 text-sm">
                        Xong
                    </button>
                </div>
            </div>
        </div>
    );
};
