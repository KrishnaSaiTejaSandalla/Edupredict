"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/ui/password-input";
import { AlertCircle, ArrowRight, Loader2, Check } from "lucide-react";

const REMEMBERED_CREDENTIALS_KEY = "ep_remembered_credentials";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load remembered credentials from web cache on mount
  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(REMEMBERED_CREDENTIALS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.password) setPassword(parsed.password);
        if (parsed.rememberMe) setRememberMe(true);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password");
      }

      // Save or clear credentials in web cache based on Remember Me selection
      try {
        if (rememberMe) {
          window.localStorage.setItem(
            REMEMBERED_CREDENTIALS_KEY,
            JSON.stringify({ email, password, rememberMe: true })
          );
        } else {
          window.localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY);
        }
      } catch {
        // Ignore localStorage quota errors
      }

      toast.success("Successfully logged in!");
      
      const userRole = data.user?.role;
      if (userRole === "admin") window.location.href = "/admin";
      else if (userRole === "teacher") window.location.href = "/teacher";
      else if (userRole === "parent") window.location.href = "/parent";
      else if (userRole === "student") window.location.href = "/student";
      else window.location.href = "/role-selection";
    } catch (err: any) {
      const msg = err.message || "Login failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-400 animate-fade-in-up"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium pub-text-secondary"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
          disabled={loading}
          className="h-12 w-full rounded-xl border pub-border-line pub-card px-4 text-sm pub-text-primary outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 disabled:opacity-50"
          placeholder="name@school.ac"
        />
      </div>

      <PasswordInput
        id="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        label="Password"
        autoComplete="current-password"
        required
        disabled={loading}
        placeholder="Enter your password"
      />

      <div className="flex items-center text-xs pub-text-muted">
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded transition-all duration-200 pub-checkbox-box ${
              rememberMe ? "pub-checkbox-checked" : "group-hover:[border-color:#22d3ee]"
            }`}
          >
            {rememberMe && <Check className="h-3 w-3 stroke-[3] text-white" />}
          </div>
          <span className="pub-text-secondary group-hover:pub-text-primary transition-colors">
            Remember me
          </span>
        </label>
      </div>

      <button
        disabled={loading}
        aria-busy={loading}
        type="submit"
        className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            <span>Signing in...</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>
    </form>
  );
}


