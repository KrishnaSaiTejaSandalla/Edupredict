"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import {
  usePreferencesStore,
  type Theme,
  type Density,
} from "@/store/usePreferencesStore";

/* ---------------------------------------------------------------
   Context — provides setTheme / setDensity to the entire tree.
   resolvedTheme is derived from the DOM attribute so there is
   no duplicate source of truth.
   --------------------------------------------------------------- */
interface ThemeContextValue {
  theme: Theme;
  density: Density;
  resolvedTheme: "dark" | "light";
  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  density: "comfortable",
  resolvedTheme: "dark",
  setTheme: () => {},
  setDensity: () => {},
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

function applyToDOM(theme: Theme, density: Density) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-density", density);
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/* ---------------------------------------------------------------
   ThemeProvider
   - initialTheme / initialDensity come from SSR cookies.
   - The <html> tag already has data-theme and data-density set
     by layout.tsx before any JS runs, so there is NO flash.
   - We hydrate the Zustand store exactly once via useLayoutEffect
     (safe — runs after render, not during it).
   - All subsequent theme changes go through store.setTheme which
     updates the DOM directly (bypass React state entirely).
   --------------------------------------------------------------- */
interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Theme;
  initialDensity?: Density;
}

export default function ThemeProvider({
  children,
  initialTheme = "dark",
  initialDensity = "comfortable",
}: ThemeProviderProps) {
  const store = usePreferencesStore();
  const hydrated = useRef(false);

  // ── Hydrate store from SSR props once, synchronously before paint ──
  // useLayoutEffect is the correct hook for DOM-synchronous init.
  // It is NOT called during render, so it never triggers the
  // "Cannot update a component while rendering" error.
  useLayoutEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    // Only update store if values differ from current store state
    // (avoids triggering unnecessary re-renders after HMR / Fast Refresh)
    const state = usePreferencesStore.getState();
    if (
      state.theme !== initialTheme ||
      state.density !== initialDensity
    ) {
      state.hydrate({ theme: initialTheme, density: initialDensity });
    }

    // Ensure DOM is in sync with SSR values (it should already be,
    // but this is a safety net for edge cases like cached pages).
    applyToDOM(initialTheme, initialDensity);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount only

  // ── Keep DOM in sync whenever theme / density changes in the store ──
  // This handles user-initiated changes after mount.
  useEffect(() => {
    applyToDOM(store.theme, store.density);
  }, [store.theme, store.density]);

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
    const handler = (e: StorageEvent) => {
      if (e.key === "ep-theme-sync" && e.newValue) {
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

  // ── Stable setTheme / setDensity callbacks ──
  const setTheme = useCallback(
    (t: Theme) => {
      store.setTheme(t);
      // Broadcast to other tabs
      try {
        localStorage.setItem(
          "ep-theme-sync",
          JSON.stringify({ theme: t, density: store.density })
        );
      } catch {
        // Safari private mode may throw
      }
    },
    [store]
  );

  const setDensity = useCallback(
    (d: Density) => {
      store.setDensity(d);
      try {
        localStorage.setItem(
          "ep-theme-sync",
          JSON.stringify({ theme: store.theme, density: d })
        );
      } catch {
        // Safari private mode may throw
      }
    },
    [store]
  );

  // resolvedTheme is derived from the store — no separate state needed
  const resolvedTheme = resolveTheme(store.theme);

  return (
    <ThemeContext.Provider
      value={{
        theme: store.theme,
        density: store.density,
        resolvedTheme,
        setTheme,
        setDensity,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
