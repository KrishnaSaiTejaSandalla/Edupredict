"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      const me = await fetch("/api/auth/me");
      if (me.ok) {
        const js = await me.json();
        const role = js?.user?.role;
        if (role === "admin") window.location.href = "/admin";
        else if (role === "teacher") window.location.href = "/teacher";
        else if (role === "parent") window.location.href = "/parent";
        else if (role === "student") window.location.href = "/student";
        else window.location.href = "/role-selection";
      } else {
        window.location.href = "/";
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <button
        type="button"
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] text-sm font-semibold text-white transition hover:bg-white/[0.09]"
      >
        <span className="text-lg font-bold text-blue-400">G</span>
        Continue with Google
      </button>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="h-px flex-1 bg-white/10" />
        or sign in with email
        <span className="h-px flex-1 bg-white/10" />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-400">
          Email address
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-400/10"
          placeholder="you@edupredict.ac"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-400">
          Password
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-400/10"
          placeholder="********"
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-slate-400">
          <input type="checkbox" className="h-4 w-4 rounded accent-blue-500" />
          Remember me
        </label>
        <span className="text-blue-400">Forgot password?</span>
      </div>
      <button
        disabled={loading}
        type="submit"
        className="h-14 w-full rounded-2xl bg-blue-500 text-sm font-semibold text-white shadow-xl shadow-blue-500/25 transition hover:bg-blue-400 disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
