"use client";
import { useState } from 'react';

function validatePassword(p: string) {
  if (p.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(p)) return 'Password must include an uppercase letter';
  if (!/[0-9]/.test(p)) return 'Password must include a number';
  return null;
}

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pv = validatePassword(password);
    if (pv) return setError(pv);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, role }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      // Registration returns user info; redirect to their role dashboard
      const userRole = data?.user?.role;
      if (userRole === 'admin') window.location.href = '/admin';
      else if (userRole === 'teacher') window.location.href = '/teacher';
      else if (userRole === 'parent') window.location.href = '/parent';
      else if (userRole === 'student') window.location.href = '/student';
      else window.location.href = '/role-selection';
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div>
        <label className="block mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className="border p-2 w-full" />
      </div>
      <div className="mt-3">
        <label className="block mb-1">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="border p-2 w-full" />
      </div>
      <div className="mt-3">
        <label className="block mb-1">Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="border p-2 w-full" />
      </div>
      <div className="mt-3">
        <label className="block mb-1">Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="border p-2 w-full">
          <option value="student">Student</option>
          <option value="parent">Parent</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <div className="text-red-600 mt-2">{error}</div>}
      <button disabled={loading} type="submit" className="mt-4 px-4 py-2 bg-green-600 text-white">{loading ? 'Registering...' : 'Register'}</button>
    </form>
  );
}
