import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { TeacherProfile } from '../types';

// Lazy-initialized Supabase client to prevent crash when URL is not yet configured
let _supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
    if (_supabaseClient) return _supabaseClient;

    const url = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
    const key = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!url || !key) return null; // Not configured yet, return null safely

    _supabaseClient = createClient(url, key);
    return _supabaseClient;
};

// Helpers
export const setSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_anon_key', key);
    // Reset cached client so it gets re-created with new config
    _supabaseClient = null;
};

export const getTeacherProfile = (): TeacherProfile | null => {
    const stored = localStorage.getItem('teacher_profile');
    return stored ? JSON.parse(stored) : null;
};

export const saveTeacherProfile = (profile: TeacherProfile) => {
    localStorage.setItem('teacher_profile', JSON.stringify(profile));
};
