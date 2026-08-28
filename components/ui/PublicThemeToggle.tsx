"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type PublicTheme = "light" | "dark";

export default function PublicThemeToggle() {
  const [theme, setTheme] = useState<PublicTheme>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("ep-public-theme");
    const nextTheme: PublicTheme = saved === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.publicTheme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: PublicTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.publicTheme = nextTheme;
    document.documentElement.dataset.theme = nextTheme;
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.localStorage.setItem("ep-public-theme", nextTheme);
    document.cookie = `ep-public-theme=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="public-theme-toggle inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}

