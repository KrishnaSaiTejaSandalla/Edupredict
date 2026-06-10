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

  return (
    <main className="p-8 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Attendance History</h1>
        <p className="text-slate-400">Browse historical attendance records.</p>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 mb-6">
        <form className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm mb-1">Class</label>
            <select name="classId" defaultValue={classId ?? ''} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white">
              <option value="">All classes</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input name="date" type="date" defaultValue={date} className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
          </div>
          <div className="flex items-end">
            <button className="w-full rounded bg-cyan-600 px-4 py-2 text-white">Filter</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
        {rows.length === 0 ? (
          <div className="text-slate-400 p-4">No attendance records found for the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-white">
              <thead className="bg-slate-950/80 text-slate-300">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Marked By</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.a.id} className="border-t border-slate-800">
                    <td className="p-3">{new Date(r.a.attendanceDate).toISOString().slice(0, 10)}</td>
                    <td className="p-3">{r.u.name}</td>
                    <td className="p-3">{r.c.name}</td>
                    <td className="p-3">{r.a.status}</td>
                    <td className="p-3">{r.a.markedBy ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}