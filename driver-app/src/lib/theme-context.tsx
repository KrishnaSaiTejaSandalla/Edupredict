import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { AppTheme, DARK_THEME, LIGHT_THEME } from '@/constants/theme';
import { StorageService } from '@/services/storage.service';

// ---- Context ----
interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---- Provider ----
interface ThemeProviderProps {
  children: ReactNode;
  /** Override system default (e.g. from Settings screen toggle) */
  initialOverride?: 'dark' | 'light' | null;
}

export function ThemeProvider({
  children,
  initialOverride = null,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [override, setOverride] = useState<'dark' | 'light' | null>(initialOverride);
  const [isReady, setIsReady] = useState(false);

  // Restore persisted theme on mount
  useEffect(() => {
    StorageService.getTheme().then((saved) => {
      if (saved) {
        setOverride(saved);
      }
      setIsReady(true);
    }).catch(() => {
      setIsReady(true);
    });
  }, []);

  // Determine effective theme
  const effectiveScheme = override ?? systemScheme ?? 'dark';
  const isDark = effectiveScheme === 'dark';
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  const toggleTheme = useCallback(() => {
    setOverride((prev) => {
      const next = (() => {
        if (prev === null) {
          return systemScheme === 'dark' ? 'light' : 'dark';
        }
        return prev === 'dark' ? 'light' : 'dark';
      })();
      void StorageService.setTheme(next);
      return next;
    });
  }, [systemScheme]);

  const setDark = useCallback((dark: boolean) => {
    const next = dark ? 'dark' : 'light';
    setOverride(next);
    void StorageService.setTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---- Hook ----
export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used inside <ThemeProvider>');
  }
  return ctx;
}
