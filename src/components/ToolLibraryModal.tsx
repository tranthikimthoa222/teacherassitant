
import React from 'react';
import { X, Search, ExternalLink } from 'lucide-react';
import type { AITool } from '../types';

interface ToolLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    tools: AITool[];
}

export const ToolLibraryModal: React.FC<ToolLibraryModalProps> = ({ isOpen, onClose, tools }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Thư viện công cụ AI</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm công cụ..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                    </div>
                    <div className="flex gap-2 mt-3 overflow-x-auto pb-2 custom-scrollbar">
                        {['Tất cả', 'Soạn giáo án', 'Tạo đề thi', 'Tiếng Anh', 'Toán học'].map(cat => (
                            <button key={cat} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-sm hover:border-teal-500 hover:text-teal-600 whitespace-nowrap">
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tools.length > 0 ? tools.map(tool => (
                        <div key={tool.id} className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                            <div className="h-32 bg-gray-200 relative">
                                {/* Placeholder for image if not valid URL */}
                                {tool.image_url ? (
                                    <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 italic">No Image</div>
                                )}
                                {tool.is_popular && <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">Phổ biến</span>}
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-gray-900 mb-1">{tool.name}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{tool.description}</p>
                                <div className="flex gap-2 mb-4 flex-wrap">
                                    {tool.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{tag}</span>
                                    ))}
                                </div>
                                <a
                                    href={tool.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-teal-50 text-teal-700 py-2 rounded-lg font-medium hover:bg-teal-100 transition-colors"
                                >
                                    Mở công cụ <ExternalLink size={14} />
                                </a>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            Không có công cụ nào.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
