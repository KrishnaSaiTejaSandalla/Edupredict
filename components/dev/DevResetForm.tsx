'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

export default function DevResetForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // Frontend validations
    if (!email.trim() || !password) {
      toast.error('Email and password are required.');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must contain at least 8 characters.');
      setStatus({ type: 'error', message: 'Password must contain at least 8 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/dev/reset-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      toast.success('Password updated successfully.');
      setStatus({ type: 'success', message: 'Password updated successfully.' });
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
      setStatus({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/30 transition-all duration-700" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/30 transition-all duration-700" />

      <div className="relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-400 bg-cyan-950/50 px-3 py-1 rounded-full border border-cyan-800/30">
            Development Tool
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-3">
            Admin Password Reset
          </h2>
          <p className="text-xs text-zinc-400">
            Reset the password for an Admin account using Better Auth scrypt hashing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="email">
              Admin Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@edupredict.ai"
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="password">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="confirm-password">
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder-zinc-500 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-200"
            />
          </div>

          {status && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all duration-300 ${
                status.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/40 text-rose-300'
              }`}
            >
              {status.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full relative py-2.5 rounded-xl font-medium text-sm text-black bg-cyan-400 hover:bg-cyan-300 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none overflow-hidden shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Resetting Password...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>

        <div className="pt-2 text-center">
          <a
            href="/login"
            className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors duration-200"
          >
            ← Back to Login Screen
          </a>
        </div>
      </div>
    </div>
  );
}
