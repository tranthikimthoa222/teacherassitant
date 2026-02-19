import type { ChatMessage, ChatSession } from '../types';

const SESSIONS_KEY = 'chat_sessions';
const MESSAGES_PREFIX = 'chat_messages_';
const BOOKMARKS_KEY = 'chat_bookmarks';

// ========== SESSIONS ==========

export const getSessions = (): ChatSession[] => {
    try {
        const raw = localStorage.getItem(SESSIONS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveSessions = (sessions: ChatSession[]) => {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
};

export const deleteSession = (id: string) => {
    const sessions = getSessions().filter(s => s.id !== id);
    saveSessions(sessions);
    localStorage.removeItem(MESSAGES_PREFIX + id);
};

export const renameSession = (id: string, title: string) => {
    const sessions = getSessions().map(s =>
        s.id === id ? { ...s, title } : s
    );
    saveSessions(sessions);
};

// ========== MESSAGES ==========

export const getMessages = (sessionId: string): ChatMessage[] => {
    try {
        const raw = localStorage.getItem(MESSAGES_PREFIX + sessionId);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveMessages = (sessionId: string, messages: ChatMessage[]) => {
    localStorage.setItem(MESSAGES_PREFIX + sessionId, JSON.stringify(messages));
};

// ========== AUTO TITLE ==========

export const generateTitle = (firstMessage: string): string => {
    // Take first 40 chars, clean up
    const clean = firstMessage.replace(/\n/g, ' ').trim();
    if (clean.length <= 40) return clean;
    return clean.substring(0, 40) + '...';
};

// ========== BOOKMARKS ==========

export interface BookmarkedMessage {
    id: string;
    sessionId: string;
    sessionTitle: string;
    message: ChatMessage;
    bookmarkedAt: string;
}

export const getBookmarks = (): BookmarkedMessage[] => {
    try {
        const raw = localStorage.getItem(BOOKMARKS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const saveBookmark = (sessionId: string, sessionTitle: string, message: ChatMessage) => {
    const bookmarks = getBookmarks();
    // Don't duplicate
    if (bookmarks.some(b => b.message.id === message.id)) return;
    bookmarks.unshift({
        id: Date.now().toString(),
        sessionId,
        sessionTitle,
        message,
        bookmarkedAt: new Date().toISOString(),
    });
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
};

export const removeBookmark = (messageId: string) => {
    const bookmarks = getBookmarks().filter(b => b.message.id !== messageId);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
};

export const isBookmarked = (messageId: string): boolean => {
    return getBookmarks().some(b => b.message.id === messageId);
};

// ========== FOLDERS ==========
const FOLDERS_KEY = 'chat_folders';

export const getChatFolders = (): string[] => {
    try {
        const raw = localStorage.getItem(FOLDERS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

export const saveChatFolders = (folders: string[]) => {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
};

export const addChatFolder = (name: string) => {
    const folders = getChatFolders();
    if (!folders.includes(name)) {
        folders.push(name);
        saveChatFolders(folders);
    }
};

export const deleteChatFolder = (name: string) => {
    saveChatFolders(getChatFolders().filter(f => f !== name));
    // Unset folder from sessions
    const sessions = getSessions().map(s =>
        s.folder === name ? { ...s, folder: undefined } : s
    );
    saveSessions(sessions);
};

export const updateSessionFolder = (id: string, folder: string | undefined) => {
    const sessions = getSessions().map(s =>
        s.id === id ? { ...s, folder } : s
    );
    saveSessions(sessions);
};

export const updateSessionTags = (id: string, tags: string[]) => {
    const sessions = getSessions().map(s =>
        s.id === id ? { ...s, tags } : s
    );
    saveSessions(sessions);
};

// ========== AUTO TAG ==========
const TAG_KEYWORDS: Record<string, string[]> = {
    'Giáo án': ['giáo án', 'kế hoạch bài dạy', 'tiết dạy', '5512', 'khbd', 'soạn bài', '5e', 'stem', 'pbl'],
    'Đề thi': ['đề thi', 'đề kiểm tra', 'trắc nghiệm', 'tự luận', 'ma trận', 'kiểm tra', 'exit ticket', 'bloom'],
    'Nhận xét': ['nhận xét', 'học bạ', 'sổ liên lạc', 'đánh giá', 'năng lực', 'phẩm chất'],
    'SKKN': ['sáng kiến', 'skkn', 'kinh nghiệm', 'thực trạng', 'giải pháp'],
    'Phương pháp': ['phương pháp', 'dạy học', 'phân hóa', 'tích hợp', 'cntt', 'công nghệ'],
    'Quản lý lớp': ['quản lý lớp', 'chủ nhiệm', 'phụ huynh', 'nội quy', 'mâu thuẫn', 'kỷ luật', 'họp phụ huynh'],
    'Học liệu': ['slide', 'video', 'kahoot', 'sơ đồ tư duy', 'flashcard', 'mindmap', 'quizizz'],
};

export const autoDetectTags = (text: string): string[] => {
    const lower = text.toLowerCase();
    const tags: string[] = [];
    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) {
            tags.push(tag);
        }
    }
    return tags.length > 0 ? tags : ['Hỏi đáp'];
};

// ========== DASHBOARD STATS ==========
export interface DashboardStats {
    totalChats: number;
    totalMessages: number;
    totalAiMessages: number;
    totalDocuments: number;
    estimatedHoursSaved: number;
    tagBreakdown: Record<string, number>;
    weeklyActivity: { day: string; count: number }[];
}

export const getDashboardStats = (): DashboardStats => {
    const sessions = getSessions();
    let totalMessages = 0;
    let totalAiMessages = 0;

    // Tag breakdown
    const tagBreakdown: Record<string, number> = {};

    // Weekly activity (7 days)
    const weeklyActivity: { day: string; count: number }[] = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        weeklyActivity.push({ day: dayNames[d.getDay()], count: 0 });
    }

    sessions.forEach(s => {
        const msgs = getMessages(s.id);
        totalMessages += msgs.length;
        const aiMsgs = msgs.filter(m => m.role === 'model');
        totalAiMessages += aiMsgs.length;

        // Tag breakdown
        const tags = s.tags || ['Khác'];
        tags.forEach(t => { tagBreakdown[t] = (tagBreakdown[t] || 0) + 1; });

        // Weekly activity
        const created = new Date(s.created_at);
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - (6 - i));
            if (created.toDateString() === d.toDateString()) {
                weeklyActivity[i].count++;
            }
        }
    });

    // Documents count
    let totalDocuments = 0;
    try {
        const docs = localStorage.getItem('reference_documents');
        if (docs) totalDocuments = JSON.parse(docs).length;
    } catch { /* ignore */ }

    return {
        totalChats: sessions.length,
        totalMessages,
        totalAiMessages,
        totalDocuments,
        estimatedHoursSaved: Math.round((totalAiMessages * 3) / 60 * 10) / 10, // 3 min per AI response
        tagBreakdown,
        weeklyActivity,
    };
};
