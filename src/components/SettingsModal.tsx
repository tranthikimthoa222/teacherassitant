
import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Check } from 'lucide-react';
import { getAvailableModels, getSelectedModel, setSelectedModel } from '../services/gemini';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (apiKey: string, supabaseUrl: string, supabaseKey: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
    const [apiKey, setApiKey] = useState('');
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseKey, setSupabaseKey] = useState('');
    const [currentModel, setCurrentModel] = useState(getSelectedModel());

    useEffect(() => {
        if (isOpen) {
            setApiKey(localStorage.getItem('gemini_api_key') || '');
            setSupabaseUrl(localStorage.getItem('supabase_url') || '');
            setSupabaseKey(localStorage.getItem('supabase_anon_key') || '');
            setCurrentModel(getSelectedModel());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(apiKey, supabaseUrl, supabaseKey);
        onClose();
    };

    const handleModelSelect = (model: string) => {
        setSelectedModel(model);
        setCurrentModel(model);
    };

    const models = getAvailableModels();

    const getModelInfo = (model: string) => {
        switch (model) {
            case 'gemini-3-flash-preview':
                return { label: '3 Flash', desc: 'Nhanh nhất, phù hợp chat thông thường', badge: 'Default', color: 'emerald' };
            case 'gemini-3-pro-preview':
                return { label: '3 Pro', desc: 'Mạnh hơn, phù hợp phân tích chuyên sâu', badge: 'Pro', color: 'teal' };
            case 'gemini-2.5-flash':
                return { label: '2.5 Flash', desc: 'Ổn định, model dự phòng tin cậy', badge: 'Stable', color: 'amber' };
            default:
                return { label: model, desc: '', badge: '', color: 'gray' };
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">⚙️ Cài đặt</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">

                    {/* === MODEL SELECTION === */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">🤖 Chọn Model AI</h3>
                        <div className="space-y-2">
                            {models.map(model => {
                                const info = getModelInfo(model);
                                const isActive = currentModel === model;
                                return (
                                    <button
                                        key={model}
                                        onClick={() => handleModelSelect(model)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isActive
                                            ? 'border-teal-500 bg-teal-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-teal-600' : 'bg-gray-200'
                                            }`}>
                                            {isActive ? <Check size={16} className="text-white" /> : <div className="w-3 h-3 rounded-full bg-gray-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900 text-sm">{info.label}</span>
                                                {info.badge && (
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${info.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                                                        info.color === 'teal' ? 'bg-teal-100 text-teal-700' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>{info.badge}</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">{info.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">💡 Nếu model lỗi, hệ thống sẽ tự động fallback sang model khác</p>
                    </div>

                    {/* === API KEY === */}
                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">🔑 Gemini API Key</h3>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            placeholder="AIza..."
                        />
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-red-500 font-medium">⚠️ Lấy API key để sử dụng app</p>
                            <a
                                href="https://aistudio.google.com/api-keys"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline font-medium"
                            >
                                <ExternalLink size={11} />
                                Lấy API Key
                            </a>
                        </div>
                    </div>

                    {/* === SUPABASE (Optional) === */}
                    <details className="border-t border-gray-100 pt-4">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
                            🗄️ Database (tùy chọn)
                        </summary>
                        <div className="mt-3 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Supabase URL</label>
                                <input
                                    type="text"
                                    value={supabaseUrl}
                                    onChange={(e) => setSupabaseUrl(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Supabase Anon Key</label>
                                <input
                                    type="password"
                                    value={supabaseKey}
                                    onChange={(e) => setSupabaseKey(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>
                    </details>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                        Lưu thay đổi
                    </button>
                </div>
            </div>
        </div>
    );
};
