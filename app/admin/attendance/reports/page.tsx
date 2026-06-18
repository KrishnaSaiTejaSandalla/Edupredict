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

  // KPI computations
  const totalStudents = report.length;
  const avgAttendance =
    totalStudents > 0
      ? Math.round(report.reduce((sum, s) => sum + s.percentage, 0) / totalStudents)
      : 0;
  const atRiskCount = report.filter((s) => s.percentage < 75).length;

  const activeTabCls = "rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2.5 text-cyan-500 dark:text-cyan-400 font-bold shadow-sm shadow-cyan-500/5 transition";
  const inactiveTabCls = "rounded-xl border border-border bg-background px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-hover transition";

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Attendance Reports</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review class-wise attendance statistics over the last 30 days.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs">
          <a href="/admin/attendance" className={inactiveTabCls}>Summary</a>
          <a href="/admin/attendance/reports" className={activeTabCls}>Reports</a>
        </nav>
      </div>

      {/* FILTER SECTION */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-md">
        <form action="/admin/attendance/reports" method="get" className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Class Selection</label>
            <select
              name="classId"
              defaultValue={classId ?? ''}
              className="select-theme"
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
            className="h-11 rounded-xl btn-blue px-6 text-xs font-bold"
          >
            Load Report
          </button>
        </form>
      </section>

      {/* KPI STRIP — visible only when a class is selected */}
      {classId && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Total Students",
              value: totalStudents,
              suffix: "",
              color: "text-cyan-500 dark:text-cyan-400",
              icon: "M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM1 20a6 6 0 0 1 12 0H1Zm12.6 0a7.5 7.5 0 0 0-2.1-4.9A5 5 0 0 1 22 20h-8.4Z",
            },
            {
              label: "Avg Attendance",
              value: avgAttendance,
              suffix: "%",
              color: avgAttendance >= 75 ? "text-emerald-500 dark:text-emerald-400" : "text-amber-500 dark:text-amber-400",
              icon: "M9 11l3 3L22 4M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
            },
            {
              label: "At Risk (<75%)",
              value: atRiskCount,
              suffix: "",
              color: atRiskCount > 0 ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400",
              icon: "M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",
            },
          ].map(({ label, value, suffix, color, icon }) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-background border border-border ${color}`}>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                </span>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
              </div>
              <p className={`mt-3 text-3xl font-black tabular-nums ${color}`}>
                {value}<span className="text-lg">{suffix}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* REPORT CONTENT */}
      {classId ? (
        <section className="rounded-2xl border border-border bg-card shadow-md overflow-hidden animate-in fade-in duration-300">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 px-6">Student</th>
                <th className="p-4 px-6">Present Days</th>
                <th className="p-4 px-6">Total Days</th>
                <th className="p-4 px-6">Attendance Rate</th>
                <th className="p-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {report.map((student) => {
                const isPassed = student.percentage >= 75;
                const initials = student.name.charAt(0).toUpperCase();

                return (
                  <tr key={student.id} className="hover:bg-hover transition duration-200">
                    <td className="p-4 px-6 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-hover text-xs font-bold text-foreground border border-border">
                          {initials}
                        </div>
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 px-6 font-semibold text-emerald-500 dark:text-emerald-400">{student.present} Days</td>
                    <td className="p-4 px-6 font-medium text-muted-foreground">{student.total} Days</td>
                    <td className="p-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                          isPassed ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {student.percentage}%
                        </span>
                        <div className="w-20 h-1.5 rounded-full bg-hover overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${isPassed ? 'bg-cyan-500 dark:bg-cyan-400' : 'bg-rose-500'}`}
                            style={{ width: `${student.percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="p-4 px-6 text-right">
                      <a
                        href={`/admin/attendance/student/${student.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-border bg-background px-3.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:bg-hover hover:text-cyan-500 transition duration-150"
                      >
                        View Details
                      </a>
                    </td>
                  </tr>
                );
              })}
              {report.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground font-medium">
                    No student logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center shadow-md">
          <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-foreground font-bold">No class selected</h3>
          <p className="mt-1 text-xs text-muted-foreground">Choose a class from the filters above to load 30-day attendance metrics.</p>
        </div>
      )}
    </main>
  );
}