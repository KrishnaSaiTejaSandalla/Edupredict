import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { attendance, classes, students, users } from '@/lib/schema';
import { and, desc, eq, like } from 'drizzle-orm';

type Props = {
  searchParams: Promise<{
    classId?: string;
    date?: string;
    q?: string;
  }>;
};

export default async function AttendanceHistoryPage({
  searchParams,
}: Props) {
  await requireRole('admin');

  const sp = await searchParams;

  const classId = sp?.classId ? Number(sp.classId) : null;
  const date = sp?.date ?? '';
  const q = sp?.q ?? '';

  const classList = await db.select().from(classes);

  const conditions = [];

  if (classId) {
    conditions.push(eq(attendance.classId, classId));
  }

  if (date) {
    conditions.push(
      eq(attendance.attendanceDate, new Date(date))
    );
  }

  if (q) {
    conditions.push(like(users.name, `%${q}%`));
  }

  const rows = await db
    .select({
      a: attendance,
      s: students,
      u: users,
      c: classes,
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .innerJoin(users, eq(users.id, students.userId))
    .innerJoin(classes, eq(attendance.classId, classes.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(attendance.attendanceDate))
    .limit(100);

  const activeTabCls = "rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2.5 text-cyan-500 dark:text-cyan-400 font-bold shadow-sm shadow-cyan-500/5 transition";
  const inactiveTabCls = "rounded-xl border border-border bg-background px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-hover transition";

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      case 'absent':
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
      case 'late':
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      case 'excused':
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20";
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Attendance History</h1>
          <p className="mt-2 text-sm text-muted-foreground">Browse historical attendance logs and filters.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs">
          <a href="/admin/attendance" className={inactiveTabCls}>Take Attendance</a>
          <a href="/admin/attendance/history" className={activeTabCls}>History</a>
          <a href="/admin/attendance/summary" className={inactiveTabCls}>Summary</a>
          <a href="/admin/attendance/reports" className={inactiveTabCls}>Reports</a>
        </nav>
      </div>

      {/* FILTER PANEL */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-md">
        <form className="grid gap-5 sm:grid-cols-4" method="get">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Search Student</label>
            <input
              name="q"
              type="text"
              defaultValue={q}
              placeholder="e.g. Arjun Sharma"
              className="input-theme"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Class Selection</label>
            <select name="classId" defaultValue={classId ?? ''} className="select-theme">
              <option value="">All classes</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Date Filter</label>
            <input
              name="date"
              type="date"
              defaultValue={date}
              className="input-theme cursor-pointer"
            />
          </div>
          <div className="flex items-end">
            <button className="h-11 w-full rounded-xl btn-blue px-5 text-xs font-bold">
              Apply Filters
            </button>
          </div>
        </form>
      </section>

      {/* HISTORY TABLE CONTAINER */}
      <section className="rounded-2xl border border-border bg-card shadow-md overflow-hidden">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center shadow-md">
            <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-sm font-semibold text-foreground">No attendance records found</h3>
            <p className="mt-1 text-xs text-muted-foreground">Adjust search queries or filters to find records.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4 px-6">Date</th>
                  <th className="p-4 px-6">Student</th>
                  <th className="p-4 px-6">Class Room</th>
                  <th className="p-4 px-6">Attendance Status</th>
                  <th className="p-4 px-6">Marked By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {rows.map((r) => {
                  const initials = r.u.name.charAt(0).toUpperCase();
                  return (
                    <tr key={r.a.id} className="hover:bg-hover transition duration-200">
                      <td className="p-4 px-6 font-medium text-muted-foreground font-mono text-xs">
                        {new Date(r.a.attendanceDate).toISOString().slice(0, 10)}
                      </td>
                      <td className="p-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded bg-hover text-[10px] font-bold text-foreground border border-border">
                            {initials}
                          </div>
                          <span className="font-semibold text-foreground">{r.u.name}</span>
                        </div>
                      </td>
                      <td className="p-4 px-6 font-semibold text-foreground">Class {r.c.name}</td>
                      <td className="p-4 px-6">
                        <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize ${getStatusBadge(r.a.status)}`}>
                          {r.a.status}
                        </span>
                      </td>
                      <td className="p-4 px-6 text-muted-foreground font-mono text-xs">User #{r.a.markedBy ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}