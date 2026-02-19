
import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, Check, Star, RefreshCw } from 'lucide-react';
import type { ChatMessage } from '../types';
import { isBookmarked } from '../services/chatStorage';

interface MessageBubbleProps {
    message: ChatMessage;
    onBookmark?: (msg: ChatMessage) => void;
    onRegenerate?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onBookmark, onRegenerate }) => {
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);
    const [starred, setStarred] = useState(() => isBookmarked(message.id));
    const [activeVersion, setActiveVersion] = useState(-1); // -1 = current

    const allVersions = useMemo(() => {
        const vs = (message.versions || []).map((v, i) => ({ text: v.text, label: `v${i + 1}`, timestamp: v.timestamp }));
        vs.push({ text: message.text, label: `v${vs.length + 1}`, timestamp: message.timestamp });
        return vs;
    }, [message.text, message.versions]);

    const displayText = activeVersion >= 0 && activeVersion < allVersions.length
        ? allVersions[activeVersion].text
        : message.text;
    const hasVersions = allVersions.length > 1;

    const handleCopy = () => {
        // Copy raw text (keeps LaTeX formulas as-is)
        navigator.clipboard.writeText(message.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStar = () => {
        if (onBookmark) {
            onBookmark(message);
            setStarred(true);
        }
    };

    return (
        <div className={`flex gap-4 p-5 ${isUser ? 'bg-white' : 'bg-slate-50/80'} border-b border-transparent hover:bg-slate-50 transition-colors duration-200 group`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${isUser
                ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                }`}>
                {isUser ? <User size={18} strokeWidth={2.5} /> : <Bot size={18} strokeWidth={2.5} />}
            </div>

            <div className="flex-1 max-w-3xl space-y-2 overflow-hidden">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-sm font-bold ${isUser ? 'text-teal-900' : 'text-slate-900'}`}>
                        {isUser ? 'Thầy/Cô chính' : 'Trợ lý AI'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Version navigation */}
                {hasVersions && !isUser && (
                    <div className="flex items-center gap-1 mb-2">
                        <span className="text-[10px] font-medium text-gray-400 mr-1">Phiên bản:</span>
                        {allVersions.map((v, i) => {
                            const isCurrent = (activeVersion === -1 && i === allVersions.length - 1) || activeVersion === i;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setActiveVersion(i === allVersions.length - 1 ? -1 : i)}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${isCurrent
                                            ? 'bg-teal-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                >
                                    {v.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className={`prose prose-slate prose-sm max-w-none text-slate-700 leading-relaxed ${isUser ? 'whitespace-pre-wrap font-medium text-slate-800' : ''
                    }`}>
                    {isUser ? (
                        message.text
                    ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[[rehypeKatex, { strict: false }]]}
                            components={{
                                h1: ({ node, ...props }) => <h1 className="text-xl font-extrabold text-slate-900 mt-6 mb-4 tracking-tight" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-slate-800 mt-5 mb-3 border-b border-slate-200 pb-1" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-base font-bold text-slate-800 mt-4 mb-2 text-teal-700" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 mb-4 space-y-1.5 marker:text-teal-400" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 mb-4 space-y-1.5 marker:text-teal-700 marker:font-semibold" {...props} />,
                                li: ({ node, ...props }) => <li className="mb-1 pl-1" {...props} />,
                                p: ({ node, ...props }) => <p className="mb-4 last:mb-0" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                                table: ({ node, ...props }) => (
                                    <div className="overflow-x-auto my-5 rounded-xl border border-slate-200 shadow-sm">
                                        <table className="min-w-full divide-y divide-slate-200 text-sm" {...props} />
                                    </div>
                                ),
                                thead: ({ node, ...props }) => <thead className="bg-slate-50 text-slate-700" {...props} />,
                                tbody: ({ node, ...props }) => <tbody className="bg-white divide-y divide-slate-100" {...props} />,
                                tr: ({ node, ...props }) => <tr className="hover:bg-teal-50/30 transition-colors" {...props} />,
                                th: ({ node, ...props }) => (
                                    <th className="px-4 py-3 text-left font-bold text-slate-700 text-xs uppercase tracking-wider whitespace-nowrap" {...props} />
                                ),
                                td: ({ node, ...props }) => (
                                    <td className="px-4 py-3 text-slate-600 border-b border-slate-50 last:border-0" {...props} />
                                ),
                                code: ({ node, inline, className, children, ...props }: any) => {
                                    return !inline ? (
                                        <div className="relative group/code my-4">
                                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                                            </div>
                                            <div className="bg-[#1e1e1e] rounded-xl p-0 overflow-hidden shadow-lg border border-slate-800">
                                                <div className="px-4 py-2 bg-[#2d2d2d] border-b border-slate-700 text-xs text-slate-400 font-mono flex items-center justify-between">
                                                    <span>Code snippet</span>
                                                </div>
                                                <div className="p-4 overflow-x-auto">
                                                    <code className={`!bg-transparent text-sm font-mono text-blue-300 ${className}`} {...props}>
                                                        {children}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <code className="bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded-md text-sm font-mono border border-teal-100/50" {...props}>
                                            {children}
                                        </code>
                                    )
                                },
                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-teal-400 pl-4 py-2 my-4 italic text-slate-600 bg-slate-50 rounded-r-lg" {...props} />,
                                a: ({ node, ...props }) => <a className="text-teal-600 hover:text-teal-800 hover:underline font-medium transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                hr: ({ node, ...props }) => <hr className="my-6 border-slate-200" {...props} />,
                            }}
                        >
                            {displayText}
                        </ReactMarkdown>
                    )}
                </div>

                {!isUser && (
                    <div className="flex items-center gap-2 pt-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-white hover:text-teal-600 hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                            title="Sao chép (giữ nguyên LaTeX)"
                        >
                            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            {copied ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                        <button
                            onClick={handleStar}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-transparent ${starred
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                                : 'text-slate-500 hover:bg-white hover:text-amber-500 hover:shadow-sm hover:border-slate-100'
                                }`}
                            title="Ghim tin nhắn"
                        >
                            <Star size={14} fill={starred ? 'currentColor' : 'none'} />
                            {starred ? 'Đã ghim' : 'Ghim'}
                        </button>
                        {onRegenerate && (
                            <button
                                onClick={() => onRegenerate(message.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-white hover:text-cyan-600 hover:shadow-sm border border-transparent hover:border-slate-100 transition-all"
                                title="Tạo lại câu trả lời"
                            >
                                <RefreshCw size={14} />
                                Tạo lại
                            </button>
                        )}
                        <div className="flex-1" />
                        <div className="flex gap-1">
                            <button className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors">
                                <ThumbsUp size={15} />
                            </button>
                            <button className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors">
                                <ThumbsDown size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
