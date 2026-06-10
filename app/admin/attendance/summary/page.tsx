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

  return (
    <main className="p-8 min-h-screen">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance Summary</h1>
          <p className="text-sm text-slate-400">See attendance totals by class and compare present/absent ratios.</p>
        </div>
        <nav className="flex gap-3 text-sm">
          <a href="/admin/attendance" className="rounded border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">Take Attendance</a>
          <a href="/admin/attendance/history" className="rounded border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800">History</a>
          <a href="/admin/attendance/summary" className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-white">Summary</a>
        </nav>
      </div>

      <section className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/70">
        <table className="min-w-full border-collapse text-left text-white">
          <thead className="bg-slate-950/80 text-slate-300">
            <tr>
              <th className="p-3">Class</th>
              <th className="p-3">Present</th>
              <th className="p-3">Absent</th>
              <th className="p-3">Total</th>
              <th className="p-3">Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {[...summary.values()].map((row) => (
              <tr key={row.className} className="border-t border-slate-800">
                <td className="p-3">{row.className}</td>
                <td className="p-3 text-emerald-400">{row.present}</td>
                <td className="p-3 text-rose-400">{row.absent}</td>
                <td className="p-3">{row.total}</td>
                <td className="p-3">{row.total ? ((row.present / row.total) * 100).toFixed(0) : '0'}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {summary.size === 0 && <div className="p-4 text-slate-400">No attendance data available yet.</div>}
      </section>
    </main>
  );
}
