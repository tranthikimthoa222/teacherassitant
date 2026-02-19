// Dark mode utility - toggles .dark class on <html> element
// Persists preference to localStorage

const DARK_MODE_KEY = 'dark_mode_preference';

export const isDarkMode = (): boolean => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) return saved === 'true';
    // Default: follow system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const setDarkMode = (dark: boolean): void => {
    localStorage.setItem(DARK_MODE_KEY, String(dark));
    if (dark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

export const toggleDarkMode = (): boolean => {
    const newState = !isDarkMode();
    setDarkMode(newState);
    return newState;
};

// Initialize on load
export const initDarkMode = (): void => {
    if (isDarkMode()) {
        document.documentElement.classList.add('dark');
    }
};
