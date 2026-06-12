import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes, students, users, attendance } from '@/lib/schema';
import { sql, and, eq, desc } from 'drizzle-orm';

type Props = {
  searchParams?: Promise<{
    classId?: string;
  }>;
};

export default async function AttendanceReportsPage({
  searchParams,
}: Props) {
  await requireRole('admin');

  const sp = await searchParams;
  const classId = sp?.classId ? Number(sp.classId) : null;

  const classList = await db.select().from(classes);

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const studentsList = classId
    ? await db
        .select({
          student: students,
          user: users,
        })
        .from(students)
        .innerJoin(users, eq(users.id, students.userId))
        .where(eq(students.classId, classId))
    : [];

  const attendanceRows = classId
    ? await db
        .select({
          studentId: attendance.studentId,
          status: attendance.status,
          attendanceDate: attendance.attendanceDate,
        })
        .from(attendance)
        .where(
          and(
            eq(attendance.classId, classId),
            sql`${attendance.attendanceDate} >= ${since}`
          )
        )
        .orderBy(desc(attendance.attendanceDate))
    : [];

  const summaryMap = new Map<
    number,
    {
      present: number;
      total: number;
    }
  >();

  for (const row of attendanceRows) {
    const current = summaryMap.get(row.studentId) ?? {
      present: 0,
      total: 0,
    };

    if (row.status === 'present') {
      current.present++;
    }

    current.total++;

    summaryMap.set(row.studentId, current);
  }

  const report = studentsList.map((row) => {
    const stats = summaryMap.get(row.student.id) ?? {
      present: 0,
      total: 0,
    };

    return {
      id: row.student.id,
      name: row.user.name,
      present: stats.present,
      total: stats.total,
      percentage:
        stats.total > 0
          ? Math.round((stats.present / stats.total) * 100)
          : 0,
    };
  });

  const activeTabCls = "rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2.5 text-cyan-400 font-bold shadow-md shadow-cyan-500/5 transition";
  const inactiveTabCls = "rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] transition";

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Attendance Reports</h1>
          <p className="mt-2 text-sm text-slate-400">Review class-wise attendance statistics over the last 30 days.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs">
          <a href="/admin/attendance" className={inactiveTabCls}>Take Attendance</a>
          <a href="/admin/attendance/history" className={inactiveTabCls}>History</a>
          <a href="/admin/attendance/summary" className={inactiveTabCls}>Summary</a>
          <a href="/admin/attendance/reports" className={activeTabCls}>Reports</a>
        </nav>
      </div>

      {/* FILTER SECTION */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
        <form action="/admin/attendance/reports" method="get" className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Class Selection</label>
            <select
              name="classId"
              defaultValue={classId ?? ''}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3.5 text-sm text-white outline-none transition focus:border-cyan-400/50 cursor-pointer"
            >
              <option value="">Select Class</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  Class {c.name}
                  {c.section ? ` (${c.section})` : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-blue-500 px-6 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 hover:scale-[1.02] active:scale-[0.98] transition duration-200"
          >
            Load Report
          </button>
        </form>
      </section>

      {/* REPORT CONTENT */}
      {classId ? (
        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/25 overflow-hidden animate-in fade-in duration-300">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/10 bg-[#070b16]/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4 px-6">Student</th>
                <th className="p-4 px-6">Present Days</th>
                <th className="p-4 px-6">Total Days</th>
                <th className="p-4 px-6">Attendance Rate</th>
                <th className="p-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {report.map((student) => {
                const isPassed = student.percentage >= 75;
                const initials = student.name.charAt(0).toUpperCase();

                return (
                  <tr key={student.id} className="hover:bg-white/[0.02] transition duration-200">
                    <td className="p-4 px-6 font-semibold text-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-bold text-slate-300 border border-white/5">
                          {initials}
                        </div>
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 px-6 font-semibold text-emerald-400">{student.present} Days</td>
                    <td className="p-4 px-6 font-medium text-slate-400">{student.total} Days</td>
                    <td className="p-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                          isPassed ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {student.percentage}%
                        </span>
                        <div className="w-20 h-1.5 rounded-full bg-white/5 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${isPassed ? 'bg-cyan-400' : 'bg-rose-500'}`}
                            style={{ width: `${student.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 px-6 text-right">
                      <a
                        href={`/admin/attendance/student/${student.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-xs font-bold text-cyan-400 hover:bg-white/[0.08] hover:text-cyan-300 transition duration-150"
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                );
              })}
              {report.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 font-medium">
                    No student logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center shadow-xl shadow-black/25">
          <svg className="mx-auto h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-white font-bold">No class selected</h3>
          <p className="mt-1 text-xs text-slate-500">Choose a class from the filters above to load 30-day attendance metrics.</p>
        </div>
      )}
    </main>
  );
}