import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { X, Search, Zap, Plus, Edit3, Trash2, FolderPlus, ChevronLeft, Save } from 'lucide-react';
import {
    getAllCategories,
    getAllTemplates,
    addCustomTemplate,
    updateCustomTemplate,
    deleteCustomTemplate,
    addCustomCategory,
} from '../data/promptTemplates';
import type { PromptTemplate, TemplateCategory } from '../data/promptTemplates';

interface PromptTemplatePanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectTemplate: (prompt: string) => void;
    initialCategory?: string;
}

// Form state for add/edit
interface TemplateForm {
    title: string;
    description: string;
    category: string;
    icon: string;
    prompt: string;
}

const emptyForm: TemplateForm = { title: '', description: '', category: '', icon: '📌', prompt: '' };

const EMOJI_OPTIONS = ['📌', '📝', '📋', '📊', '✅', '💡', '🎯', '🔬', '💻', '📖', '✏️', '🔍', '📅', '📄', '📑', '👥', '📬', '🏦', '📈', '⭐', '🚀', '🎓', '🧪', '📐', '🎨'];

export const PromptTemplatePanel: React.FC<PromptTemplatePanelProps> = ({ isOpen, onClose, onSelectTemplate, initialCategory }) => {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [allTemplates, setAllTemplates] = useState<PromptTemplate[]>([]);

    // CRUD states
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<TemplateForm>(emptyForm);
    const [showNewCatForm, setShowNewCatForm] = useState(false);
    const [newCatLabel, setNewCatLabel] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('📁');
    const [contextMenuId, setContextMenuId] = useState<string | null>(null);

    const refreshData = useCallback(() => {
        setCategories(getAllCategories());
        setAllTemplates(getAllTemplates());
    }, []);

    // Load data when panel opens
    useEffect(() => {
        if (isOpen) {
            refreshData();
            setActiveCategory(initialCategory || 'all');
            setSearchQuery('');
            setShowForm(false);
            setEditingId(null);
            setContextMenuId(null);
        }
    }, [isOpen, initialCategory, refreshData]);

    const filtered = useMemo(() => {
        let list = allTemplates;
        if (activeCategory !== 'all') {
            list = list.filter(t => t.category === activeCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(t =>
                t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.prompt.toLowerCase().includes(q)
            );
        }
        return list;
    }, [activeCategory, searchQuery, allTemplates]);

    const handleSelect = (template: PromptTemplate) => {
        if (contextMenuId) { setContextMenuId(null); return; }
        onSelectTemplate(template.prompt);
        onClose();
    };

    // ===== CRUD Handlers =====
    const handleAdd = () => {
        setEditingId(null);
        setForm({ ...emptyForm, category: activeCategory !== 'all' ? activeCategory : 'khac' });
        setShowForm(true);
    };

    const handleEdit = (t: PromptTemplate) => {
        setEditingId(t.id);
        setForm({ title: t.title, description: t.description, category: t.category, icon: t.icon, prompt: t.prompt });
        setShowForm(true);
        setContextMenuId(null);
    };

    const handleDelete = (t: PromptTemplate) => {
        if (confirm(`Xóa prompt "${t.title}"?`)) {
            deleteCustomTemplate(t.id);
            refreshData();
        }
        setContextMenuId(null);
    };

    const handleSaveForm = () => {
        if (!form.title.trim() || !form.prompt.trim()) return;
        if (editingId) {
            updateCustomTemplate(editingId, form);
        } else {
            addCustomTemplate(form);
        }
        refreshData();
        setShowForm(false);
        setEditingId(null);
    };

    const handleAddCategory = () => {
        if (!newCatLabel.trim()) return;
        addCustomCategory(newCatLabel.trim(), newCatIcon);
        refreshData();
        setShowNewCatForm(false);
        setNewCatLabel('');
        setNewCatIcon('📁');
    };

    // Close context menu when clicking elsewhere
    useEffect(() => {
        if (!contextMenuId) return;
        const handler = () => setContextMenuId(null);
        window.addEventListener('click', handler);
        return () => window.removeEventListener('click', handler);
    }, [contextMenuId]);

    if (!isOpen) return null;

    // ===== Add/Edit Form View =====
    if (showForm) {
        const availableCategories = categories.filter(c => c.id !== 'all');
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
                <div className="bg-white w-full sm:w-[90vw] sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ChevronLeft size={20} className="text-gray-500" />
                            </button>
                            <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Sửa Prompt' : 'Thêm Prompt Mới'}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {/* Icon + Title */}
                        <div className="flex gap-3">
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                                <div className="relative group">
                                    <button className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-xl text-2xl flex items-center justify-center hover:bg-gray-100 transition-colors">
                                        {form.icon}
                                    </button>
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 grid grid-cols-5 gap-1 z-10 hidden group-hover:grid w-48">
                                        {EMOJI_OPTIONS.map(e => (
                                            <button key={e} onClick={() => setForm({ ...form, icon: e })} className={`w-8 h-8 rounded-lg text-lg flex items-center justify-center hover:bg-teal-50 transition-colors ${form.icon === e ? 'bg-teal-100 ring-2 ring-teal-400' : ''}`}>
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 mb-1">Tên prompt <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="VD: Soạn giáo án..."
                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mô tả ngắn</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="VD: Hỗ trợ soạn giáo án chi tiết..."
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Thư mục</label>
                            <div className="flex gap-2 flex-wrap">
                                {availableCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setForm({ ...form, category: cat.id })}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${form.category === cat.id
                                            ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                    >
                                        <span>{cat.icon}</span>
                                        <span>{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Prompt Content */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Nội dung Prompt <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={form.prompt}
                                onChange={e => setForm({ ...form, prompt: e.target.value })}
                                placeholder="Viết prompt ở đây... Dùng [tên biến] để tạo placeholder.\nVD: Hãy soạn giáo án môn [môn học] lớp [lớp]..."
                                rows={8}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none leading-relaxed"
                            />
                            <p className="text-[11px] text-gray-400 mt-1">💡 Dùng [tên biến] để tạo placeholder, VD: [môn học], [lớp], [nội dung]</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-100 flex gap-3">
                        <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                            Hủy
                        </button>
                        <button
                            onClick={handleSaveForm}
                            disabled={!form.title.trim() || !form.prompt.trim()}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Save size={16} />
                            {editingId ? 'Lưu thay đổi' : 'Thêm vào kho'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ===== Main View =====
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
            <div
                className="bg-white w-full sm:w-[90vw] sm:max-w-4xl sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl text-white">
                            <Zap size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Kho Prompt Templates</h2>
                            <p className="text-xs text-gray-500">{allTemplates.length} mẫu câu lệnh chuyên biệt cho GV</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Thêm</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Search + Categories */}
                <div className="px-5 pt-4 pb-2 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm template..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar items-center">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        ))}
                        {/* Add Category Button */}
                        {showNewCatForm ? (
                            <div className="flex items-center gap-1 bg-white border border-teal-200 rounded-full px-2 py-1 shadow-sm" onClick={e => e.stopPropagation()}>
                                <div className="relative group">
                                    <button className="w-7 h-7 rounded-full bg-gray-50 text-sm flex items-center justify-center hover:bg-gray-100">{newCatIcon}</button>
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 grid grid-cols-5 gap-1 z-10 hidden group-hover:grid w-40">
                                        {['📁', '⭐', '🎓', '🚀', '🧪', '📐', '🎨', '💼', '🔬', '📌'].map(e => (
                                            <button key={e} onClick={() => setNewCatIcon(e)} className={`w-6 h-6 rounded text-sm flex items-center justify-center hover:bg-teal-50 ${newCatIcon === e ? 'bg-teal-100' : ''}`}>{e}</button>
                                        ))}
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={newCatLabel}
                                    onChange={e => setNewCatLabel(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                    placeholder="Tên thư mục..."
                                    className="w-24 bg-transparent border-0 text-sm focus:ring-0 px-1"
                                    autoFocus
                                />
                                <button onClick={handleAddCategory} className="p-1 text-teal-600 hover:bg-teal-50 rounded-full">
                                    <Plus size={14} />
                                </button>
                                <button onClick={() => setShowNewCatForm(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-full">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowNewCatForm(true)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-white border-2 border-dashed border-gray-300 text-gray-400 hover:border-teal-300 hover:text-teal-500 transition-all"
                            >
                                <FolderPlus size={14} />
                                <span>Thư mục</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-3xl mb-2">🔍</p>
                            <p>Không tìm thấy template phù hợp</p>
                            <button onClick={handleAdd} className="mt-4 flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-xl text-sm font-medium mx-auto hover:bg-teal-100 transition-colors">
                                <Plus size={16} /> Thêm prompt mới
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                            {filtered.map(template => (
                                <div
                                    key={template.id}
                                    className="relative flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-teal-300 hover:shadow-md transition-all duration-200 group text-left hover:-translate-y-0.5 cursor-pointer"
                                    onClick={() => handleSelect(template)}
                                >
                                    <div className="flex items-center gap-2 mb-2 w-full">
                                        <span className="text-xl">{template.icon}</span>
                                        <span className="font-semibold text-gray-800 text-sm flex-1 line-clamp-1">{template.title}</span>
                                        {template.slashCommand && (
                                            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                                {template.slashCommand}
                                            </span>
                                        )}
                                        {/* Context menu for custom templates */}
                                        {template.isCustom && (
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setContextMenuId(contextMenuId === template.id ? null : template.id); }}
                                                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                                                >
                                                    <Edit3 size={14} className="text-gray-400" />
                                                </button>
                                                {contextMenuId === template.id && (
                                                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden w-36" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => handleEdit(template)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                                            <Edit3 size={14} /> Chỉnh sửa
                                                        </button>
                                                        <button onClick={() => handleDelete(template)} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                                            <Trash2 size={14} /> Xóa
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{template.description}</p>
                                    {template.isCustom && (
                                        <span className="mt-2 text-[10px] bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded-full font-medium">Tự tạo</span>
                                    )}
                                    {template.variables && template.variables.length > 0 && !template.isCustom && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {template.variables.slice(0, 3).map(v => (
                                                <span key={v} className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                                                    [{v}]
                                                </span>
                                            ))}
                                            {template.variables.length > 3 && (
                                                <span className="text-[10px] text-gray-400">+{template.variables.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 sm:rounded-b-2xl">
                    <p className="text-[11px] text-gray-400 text-center">
                        💡 Gõ <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-600 font-mono">/</kbd> trong chat để dùng Slash Commands • Nhấn <button onClick={handleAdd} className="text-teal-500 hover:underline font-medium">+ Thêm</button> để tạo prompt của bạn
                    </p>
                </div>
            </div>
        </div>
    );
};
