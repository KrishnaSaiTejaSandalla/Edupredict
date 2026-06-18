import { create } from 'zustand';
import { upsertUserPreferences } from '@/lib/settings-actions';

export type Theme = 'dark' | 'light' | 'system';
export type Density = 'compact' | 'comfortable' | 'spacious';

function getRoleSuffix(): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return "_admin";
  if (path.startsWith("/teacher")) return "_teacher";
  if (path.startsWith("/parent")) return "_parent";
  if (path.startsWith("/student")) return "_student";
  return "";
}

interface PreferencesState {
  theme: Theme;
  density: Density;
  sidebarCollapsed: boolean;
  language: string;
  setTheme: (theme: Theme, userId?: number) => Promise<void>;
  setDensity: (density: Density, userId?: number) => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean, userId?: number) => Promise<void>;
  setLanguage: (lang: string, userId?: number) => Promise<void>;
  hydrate: (prefs: {
    theme?: string;
    density?: string;
    sidebarCollapsed?: boolean;
    language?: string;
  }) => void;
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  theme: 'dark',
  density: 'comfortable',
  sidebarCollapsed: false,
  language: 'en',
  setTheme: async (theme, userId) => {
    set({ theme });
    // Update DOM attribute for immediate feedback
    if (typeof document !== 'undefined') {
      const resolved = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      const suffix = getRoleSuffix();
      document.cookie = `ep-theme${suffix}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
    if (userId) {
      try {
        await upsertUserPreferences(userId, { theme });
      } catch (e) {
        console.error('Failed to upsert theme preference:', e);
      }
    }
  },
  setDensity: async (density, userId) => {
    set({ density });
    // Update DOM attribute
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-density', density);
      const suffix = getRoleSuffix();
      document.cookie = `ep-density${suffix}=${density}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
    if (userId) {
      try {
        await upsertUserPreferences(userId, { density });
      } catch (e) {
        console.error('Failed to upsert density preference:', e);
      }
    }
  },
  setSidebarCollapsed: async (sidebarCollapsed, userId) => {
    set({ sidebarCollapsed });
    if (userId) {
      try {
        await upsertUserPreferences(userId, { sidebarCollapsed });
      } catch (e) {
        console.error('Failed to upsert sidebar preference:', e);
      }
    }
  },
  setLanguage: async (language, userId) => {
    set({ language });
    if (userId) {
      try {
        await upsertUserPreferences(userId, { language });
      } catch (e) {
        console.error('Failed to upsert language preference:', e);
      }
    }
  },
  hydrate: (prefs) => {
    // Idempotent — only update if at least one value changed.
    // This prevents Zustand from triggering unnecessary re-renders
    // when ThemeProvider calls hydrate on every mount.
    const state = get();
    const nextTheme = (prefs.theme as Theme) ?? state.theme;
    const nextDensity = (prefs.density as Density) ?? state.density;
    const nextSidebarCollapsed = prefs.sidebarCollapsed ?? state.sidebarCollapsed;
    const nextLanguage = prefs.language ?? state.language;

    if (
      nextTheme === state.theme &&
      nextDensity === state.density &&
      nextSidebarCollapsed === state.sidebarCollapsed &&
      nextLanguage === state.language
    ) {
      return; // Nothing changed — skip the set() call entirely
    }

    set({
      theme: nextTheme,
      density: nextDensity,
      sidebarCollapsed: nextSidebarCollapsed,
      language: nextLanguage,
    });
  }
}));
