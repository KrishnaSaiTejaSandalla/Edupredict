"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import {
  usePreferencesStore,
  type Theme,
  type Density,
} from "@/store/usePreferencesStore";

/* ---------------------------------------------------------------
   Context — provides setTheme / setDensity / setColorPreset to the
   entire tree.
   --------------------------------------------------------------- */
interface ThemeContextValue {
  theme: Theme;
  density: Density;
  colorPreset: string;
  resolvedTheme: "dark" | "light";
  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
  /** Pass persist=true to write the ep-color-preset cookie (on Save). */
  setColorPreset: (p: string, persist?: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  density: "comfortable",
  colorPreset: "ocean-blue",
  resolvedTheme: "dark",
  setTheme: () => {},
  setDensity: () => {},
  setColorPreset: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/* ---------------------------------------------------------------
   Helpers
   --------------------------------------------------------------- */
function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(theme: Theme): "dark" | "light" {
  return theme === "system" ? getSystemTheme() : theme;
}

function getRoleSuffix(): string {
  if (typeof window === "undefined") return "";
  const path = window.location.pathname;
  if (path.startsWith("/admin")) return "_admin";
  if (path.startsWith("/teacher")) return "_teacher";
  if (path.startsWith("/parent")) return "_parent";
  if (path.startsWith("/student")) return "_student";
  return "";
}

function applyToDOM(theme: Theme, density: Density, preset?: string) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-density", density);
  if (preset) root.setAttribute("data-color-preset", preset);
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/* ---------------------------------------------------------------
   ThemeProvider
   - initialTheme / initialDensity / initialPreset come from SSR cookies.
   - The <html> tag already has attributes set by layout.tsx before any
     JS runs, so there is NO flash.
   - We hydrate the Zustand store exactly once via useLayoutEffect.
   - colorPreset uses local React state. setColorPreset(p, true) also
     writes the cookie for cross-page persistence.
   --------------------------------------------------------------- */
interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Theme;
  initialDensity?: Density;
  initialPreset?: string;
}

export default function ThemeProvider({
  children,
  initialTheme = "dark",
  initialDensity = "comfortable",
  initialPreset = "ocean-blue",
}: ThemeProviderProps) {
  const store = usePreferencesStore();
  const hydrated = useRef(false);
  const [colorPreset, setColorPresetState] = useState(initialPreset);

  // ── Hydrate store from SSR props once, synchronously before paint ──
  useLayoutEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const state = usePreferencesStore.getState();
    if (state.theme !== initialTheme || state.density !== initialDensity) {
      state.hydrate({ theme: initialTheme, density: initialDensity });
    }
    applyToDOM(initialTheme, initialDensity, initialPreset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep DOM in sync whenever theme / density / preset changes ──
  useEffect(() => {
    applyToDOM(store.theme, store.density, colorPreset);
  }, [store.theme, store.density, colorPreset]);

  // ── Watch OS preference when theme is "system" ──
  useEffect(() => {
    if (store.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      document.documentElement.setAttribute("data-theme", resolved);
      if (resolved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [store.theme]);

  // ── Cross-tab sync via storage event ──
  useEffect(() => {
    const suffix = getRoleSuffix();
    const handler = (e: StorageEvent) => {
      if (e.key === `ep-theme-sync${suffix}` && e.newValue) {
        try {
          const { theme, density } = JSON.parse(e.newValue) as {
            theme: Theme;
            density: Density;
          };
          usePreferencesStore.getState().hydrate({ theme, density });
        } catch {
          // ignore malformed events
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ── Stable setTheme ──
  const setTheme = useCallback(
    (t: Theme) => {
      store.setTheme(t);
      try {
        const suffix = getRoleSuffix();
        localStorage.setItem(
          `ep-theme-sync${suffix}`,
          JSON.stringify({ theme: t, density: store.density })
        );
      } catch {
        // Safari private mode may throw
      }
    },
    [store]
  );

  // ── Stable setDensity ──
  const setDensity = useCallback(
    (d: Density) => {
      store.setDensity(d);
      try {
        const suffix = getRoleSuffix();
        localStorage.setItem(
          `ep-theme-sync${suffix}`,
          JSON.stringify({ theme: store.theme, density: d })
        );
      } catch {
        // Safari private mode may throw
      }
    },
    [store]
  );

  // ── Stable setColorPreset ──
  const setColorPreset = useCallback(
    (p: string, persist = false) => {
      setColorPresetState(p);
      document.documentElement.setAttribute("data-color-preset", p);
      if (persist) {
        try {
          const suffix = getRoleSuffix();
          document.cookie = `ep-color-preset${suffix}=${p}; path=/; max-age=${
            60 * 60 * 24 * 365
          }; SameSite=Lax`;
        } catch {
          // ignore
        }
      }
    },
    []
  );

  const resolvedTheme = resolveTheme(store.theme);

  return (
    <ThemeContext.Provider
      value={{
        theme: store.theme,
        density: store.density,
        colorPreset,
        resolvedTheme,
        setTheme,
        setDensity,
        setColorPreset,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
