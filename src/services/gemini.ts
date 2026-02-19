
import { GoogleGenerativeAI } from '@google/generative-ai';

let _genAI: GoogleGenerativeAI | null = null;

const getGenAI = (): GoogleGenerativeAI | null => {
    if (_genAI) return _genAI;
    const key = localStorage.getItem('gemini_api_key') || '';
    if (!key) return null;
    _genAI = new GoogleGenerativeAI(key);
    return _genAI;
};

export const setGeminiApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    _genAI = null; // Reset so it re-creates with new key
};

export const getGeminiApiKey = () => localStorage.getItem('gemini_api_key');

const MODELS = ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-2.5-flash'];

let _selectedModel: string | null = null;

export const getSelectedModel = (): string => {
    if (_selectedModel) return _selectedModel;
    return localStorage.getItem('selected_model') || MODELS[0];
};

export const setSelectedModel = (model: string) => {
    _selectedModel = model;
    localStorage.setItem('selected_model', model);
};

export const getAvailableModels = () => MODELS;

export const generateResponse = async (history: { role: string; parts: { text: string }[] }[], userMessage: string) => {
    const genAI = getGenAI();
    if (!genAI) throw new Error("API Key chưa được nhập. Vui lòng vào Cài đặt để nhập API Key.");

    // Build ordered model list: selected model first, then remaining
    const selected = getSelectedModel();
    const orderedModels = [selected, ...MODELS.filter(m => m !== selected)];

    let lastError: unknown = null;

    for (const modelName of orderedModels) {
        try {
            console.log(`[Gemini] Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const chat = model.startChat({
                history: history,
                generationConfig: {
                    maxOutputTokens: 4096,
                },
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            const text = response.text();
            if (text) {
                console.log(`[Gemini] ✅ Success with model: ${modelName}`);
                return text;
            }
        } catch (error: any) {
            console.warn(`[Gemini] ❌ Model ${modelName} failed:`, error?.message || error);
            lastError = error;
            // Continue to next model
        }
    }

    // All models failed
    const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Tất cả model đều thất bại. Lỗi cuối: ${errMsg}`);
};
