
export interface TeacherProfile {
    id?: string;
    name: string;
    subject: string;
    school_level: string;
    school_name?: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model'; // 'model' is what Gemini uses, we can map to UI 'assistant'
    text: string;
    timestamp: string; // ISO string
    versions?: { text: string; timestamp: string }[];
}

export interface ChatSession {
    id: string;
    title: string;
    created_at: string;
    selectedDocIds?: string[];
    folder?: string;
    tags?: string[];
    pinned?: boolean;
}

export interface AITool {
    id: string;
    name: string;
    description: string;
    url: string;
    category: string;
    tags: string[];
    image_url: string;
    is_popular?: boolean;
    is_new?: boolean;
    is_pro?: boolean;
}
