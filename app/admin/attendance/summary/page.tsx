import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { attendance, classes } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

export default async function AttendanceSummaryPage() {
  await requireRole('admin');

  const summaryRows = await db
    .select({ a: attendance, c: classes })
    .from(attendance)
    .innerJoin(classes, eq(attendance.classId, classes.id))
    .orderBy(desc(attendance.attendanceDate))
    .limit(200);

  const summary = summaryRows.reduce((acc, row) => {
    const classId = row.a.classId;
    const existing = acc.get(classId) ?? { className: row.c.name, present: 0, absent: 0, total: 0 };
    if (row.a.status === 'present') existing.present += 1;
    else existing.absent += 1;
    existing.total += 1;
    acc.set(classId, existing);
    return acc;
  }, new Map<number, { className: string; present: number; absent: number; total: number }>());

  const activeTabCls = "rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2.5 text-cyan-500 dark:text-cyan-400 font-bold shadow-sm shadow-cyan-500/5 transition";
  const inactiveTabCls = "rounded-xl border border-border bg-background px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-hover transition";

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Attendance Summary</h1>
          <p className="mt-2 text-sm text-muted-foreground">See attendance totals by class and compare present/absent ratios.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs">
          <a href="/admin/attendance" className={inactiveTabCls}>Take Attendance</a>
          <a href="/admin/attendance/history" className={inactiveTabCls}>History</a>
          <a href="/admin/attendance/summary" className={activeTabCls}>Summary</a>
          <a href="/admin/attendance/reports" className={inactiveTabCls}>Reports</a>
        </nav>
      </div>

      {/* SUMMARY TABLE CONTAINER */}
      <section className="overflow-x-auto rounded-2xl border border-border bg-card shadow-md">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-4 px-6">Class Name</th>
              <th className="p-4 px-6">Present Records</th>
              <th className="p-4 px-6">Absent Records</th>
              <th className="p-4 px-6">Total Records</th>
              <th className="p-4 px-6">Attendance Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {summary.size === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">
                  No summary data available yet.
                </td>
              </tr>
            ) : (
              [...summary.values()].map((row) => {
                const percentage = row.total ? Math.round((row.present / row.total) * 100) : 0;
                const isHigh = percentage >= 75;

                return (
                  <tr key={row.className} className="hover:bg-hover transition duration-200">
                    <td className="p-4 px-6 font-semibold text-foreground">Class {row.className}</td>
                    <td className="p-4 px-6 font-semibold text-emerald-500 dark:text-emerald-400">{row.present}</td>
                    <td className="p-4 px-6 font-semibold text-rose-500">{row.absent}</td>
                    <td className="p-4 px-6 text-muted-foreground font-medium">{row.total}</td>
                    <td className="p-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                          isHigh ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {percentage}%
                        </span>
                        <div className="w-24 h-2 rounded-full bg-hover overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${isHigh ? 'bg-cyan-500 dark:bg-cyan-400' : 'bg-amber-500'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
