'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { adminResetUserPassword } from '@/lib/admin-credential-actions';

interface CredentialsManagerProps {
  userId: number;
  label?: string;
}

export default function CredentialsManager({ userId, label = "User Credentials" }: CredentialsManagerProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  function generatePassword() {
    const prefixes = ['Edu', 'School', 'Parent', 'Student', 'Class', 'Learn', 'Acad'];
    const separators = ['@', '#', '$', '&'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const sep = separators[Math.floor(Math.random() * separators.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const generated = `${prefix}${sep}${num}`;
    setPassword(generated);
    setShowPassword(true);
  }

  async function handleReset() {
    if (!password || password.trim().length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }
    setResetting(true);
    const toastId = toast.loading('Resetting password...');
    try {
      const res = await adminResetUserPassword(userId, password);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        setPassword('');
      } else {
        toast.error('Failed to reset password.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error resetting password.', { id: toastId });
    } finally {
      setResetting(false);
    }
  }

  function handleCopy() {
    if (!password) {
      toast.error('No password to copy.');
      return;
    }
    navigator.clipboard.writeText(password);
    toast.success('Password copied to clipboard!');
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-4 transition-colors duration-200">
      <div>
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b border-border pb-3">{label}</h3>
      </div>

      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Temporary Password</label>
        <div className="relative flex items-center">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter or generate password"
            className="h-10 w-full rounded-xl border border-border bg-input text-foreground outline-none focus:border-cyan-500 transition-all placeholder:text-muted-foreground pl-3 pr-16 text-xs"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-10 text-muted-foreground hover:text-foreground transition"
            title="Copy Password"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-muted-foreground hover:text-foreground transition"
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 7c-2.76 0-5 2.24-5 5 0 .65.13 1.26.36 1.82l2.92-2.92c.3-.56.88-.9 1.5-.9.96 0 1.72.76 1.72 1.72 0 .62-.34 1.2-.9 1.5l-2.92 2.92c.56.23 1.17.36 1.82.36 2.76 0 5-2.24 5-5s-2.24-5-5-5zm-7.27-.56L3.27 4.98 1.41 6.83l2.84 2.84C3.47 10.42 3 11.17 3 12c0 4.14 3.36 7.5 7.5 7.5 1.15 0 2.24-.26 3.22-.72l6.45 6.45 1.86-1.86-6.45-6.45c.46-.98.72-2.07.72-3.22 0-4.14-3.36-7.5-7.5-7.5-.83 0-1.58.47-2 .9L4.73 6.44zm7.27 1.56c1.66 0 3 1.34 3 3 0 .11-.01.22-.03.32l-3.29-3.29c.1-.02.21-.03.32-.03z"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={generatePassword}
          className="flex-1 rounded-xl border border-border bg-background py-2 text-xs font-semibold text-foreground transition hover:bg-hover"
        >
          Generate Password
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={resetting || !password}
          className="flex-1 btn-cyan rounded-xl py-2 text-xs font-semibold disabled:opacity-50"
        >
          {resetting ? 'Resetting...' : 'Reset Password'}
        </button>
      </div>
    </div>
  );
}
