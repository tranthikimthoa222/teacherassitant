
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, FileText, Clock, Tag, BarChart3, TrendingUp } from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '../services/chatStorage';

interface DashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TAG_COLORS: Record<string, string> = {
    'Giáo án': 'bg-blue-100 text-blue-700',
    'Đề thi': 'bg-purple-100 text-purple-700',
    'Nhận xét': 'bg-amber-100 text-amber-700',
    'SKKN': 'bg-rose-100 text-rose-700',
    'Phương pháp': 'bg-emerald-100 text-emerald-700',
    'Quản lý lớp': 'bg-orange-100 text-orange-700',
    'Học liệu': 'bg-cyan-100 text-cyan-700',
    'Hỏi đáp': 'bg-gray-100 text-gray-600',
    'Khác': 'bg-gray-100 text-gray-600',
};

export const DashboardModal: React.FC<DashboardModalProps> = ({ isOpen, onClose }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        if (isOpen) setStats(getDashboardStats());
    }, [isOpen]);

    if (!isOpen || !stats) return null;

    const maxWeekly = Math.max(...stats.weeklyActivity.map(d => d.count), 1);
    const tagEntries = Object.entries(stats.tagBreakdown).sort((a, b) => b[1] - a[1]);
    const maxTag = Math.max(...tagEntries.map(e => e[1]), 1);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl text-white">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Dashboard</h2>
                            <p className="text-xs text-gray-500">Thống kê hoạt động của bạn</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <MessageCircle size={16} className="text-teal-600" />
                                <span className="text-xs font-medium text-teal-600">Cuộc trò chuyện</span>
                            </div>
                            <p className="text-2xl font-bold text-teal-700">{stats.totalChats}</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Tag size={16} className="text-purple-600" />
                                <span className="text-xs font-medium text-purple-600">Tin nhắn</span>
                            </div>
                            <p className="text-2xl font-bold text-purple-700">{stats.totalMessages}</p>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText size={16} className="text-emerald-600" />
                                <span className="text-xs font-medium text-emerald-600">Tài liệu</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700">{stats.totalDocuments}</p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock size={16} className="text-amber-600" />
                                <span className="text-xs font-medium text-amber-600">Tiết kiệm</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-700">~{stats.estimatedHoursSaved}h</p>
                        </div>
                    </div>

                    {/* Teal highlight box */}
                    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl p-4 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={18} />
                            <span className="font-semibold text-sm">Tổng kết</span>
                        </div>
                        <p className="text-sm opacity-90">
                            Bạn đã tạo <strong>{stats.totalAiMessages}</strong> câu trả lời AI, tiết kiệm khoảng <strong>~{stats.estimatedHoursSaved} giờ</strong> làm việc thủ công!
                        </p>
                    </div>

                    {/* Weekly Activity */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <BarChart3 size={14} /> Hoạt động 7 ngày qua
                        </h3>
                        <div className="flex items-end gap-2 h-28 bg-gray-50 rounded-xl p-3">
                            {stats.weeklyActivity.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-[10px] font-bold text-teal-600">{d.count > 0 ? d.count : ''}</span>
                                    <div
                                        className="w-full rounded-lg bg-gradient-to-t from-teal-500 to-cyan-400 transition-all duration-500 min-h-[4px]"
                                        style={{ height: `${Math.max((d.count / maxWeekly) * 100, 5)}%` }}
                                    />
                                    <span className="text-[10px] font-medium text-gray-500">{d.day}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tag Breakdown */}
                    {tagEntries.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <Tag size={14} /> Phân loại cuộc trò chuyện
                            </h3>
                            <div className="space-y-2">
                                {tagEntries.map(([tag, count]) => (
                                    <div key={tag} className="flex items-center gap-3">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${TAG_COLORS[tag] || TAG_COLORS['Khác']}`}>
                                            {tag}
                                        </span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all duration-500"
                                                style={{ width: `${(count / maxTag) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 w-6 text-right">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
