import { requireRole } from '@/lib/auth';
import LogoutButton from '@/components/auth/LogoutButton';

export default async function StudentPage() {
  const user = await requireRole('student');

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl bg-white/5 border border-slate-800 rounded-lg p-8 text-slate-100">
        <h1 className="text-2xl font-semibold">Student Dashboard</h1>
        <p className="mt-2">Welcome back, <strong>{user.name}</strong></p>
        <p className="text-sm text-slate-300">Role: {user.role}</p>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
