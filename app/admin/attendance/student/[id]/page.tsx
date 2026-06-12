import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { students, users, attendance, classes } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentAttendanceReport({
  params,
}: Props) {
  await requireRole('admin');

  const { id } = await params;
  const studentId = Number(id);

  const [studentRow] = await db
    .select({
      s: students,
      u: users,
      c: classes,
    })
    .from(students)
    .leftJoin(users, eq(users.id, students.userId))
    .leftJoin(classes, eq(classes.id, students.classId))
    .where(eq(students.id, studentId))
    .limit(1);

  if (!studentRow) {
    return (
      <main className="min-h-screen bg-[#070b16] p-8 text-slate-400 font-semibold flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
        Student not found.
      </main>
    );
  }

  const rows = await db
    .select()
    .from(attendance)
    .where(eq(attendance.studentId, studentId))
    .orderBy(desc(attendance.attendanceDate));

  const total = rows.length;
  const present = rows.filter((r) => r.status === 'present').length;
  const absent = rows.filter((r) => r.status === 'absent').length;
  const late = rows.filter((r) => r.status === 'late').length;
  
  const percentage = total
    ? Math.round((present / total) * 100)
    : 0;

  let statusLabel = 'Needs Attention';
  let statusColor = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
  if (percentage >= 90) {
    statusLabel = 'Excellent';
    statusColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  } else if (percentage >= 80) {
    statusLabel = 'Good';
    statusColor = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
  } else if (percentage >= 70) {
    statusLabel = 'Average';
    statusColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case 'absent':
        return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
      case 'late':
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case 'excused':
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
    }
  };

  const initials = studentRow.u?.name.charAt(0).toUpperCase() || 'S';

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER & NAV BACK LINK */}
      <div className="flex flex-col gap-4">
        <a
          href="/admin/attendance/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to Reports
        </a>
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mt-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-2xl font-bold text-white shadow-lg shadow-cyan-500/25">
            {initials}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{studentRow.u?.name ?? 'Student'}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Class Room: <span className="text-white font-semibold">{studentRow.c?.name ?? '—'}</span> &bull; Roll Number: <span className="text-white font-semibold">{studentRow.s.rollNumber || '—'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* METRICS DASHBOARD CARD GRID */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance Rate</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-cyan-400">{percentage}%</p>
            <span className="text-xs font-medium text-cyan-400/80">Overall</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Days Present</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-emerald-400">{present}</p>
            <span className="text-xs font-medium text-emerald-400/80">Present</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Days Absent</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-rose-500">{absent}</p>
            <span className="text-xs font-medium text-rose-500/80">Absent</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Days Late</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-amber-500">{late}</p>
            <span className="text-xs font-medium text-amber-500/80">Late logs</span>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Academic Standing</p>
          <div className="flex items-center justify-between mt-3">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </section>

      {/* ATTENDANCE HISTORY TABLE */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/25 overflow-hidden">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="border-b border-white/10 bg-[#070b16]/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-4 px-6">Date</th>
              <th className="p-4 px-6">Attendance Status</th>
              <th className="p-4 px-6">Remarks / Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02] transition duration-200">
                <td className="p-4 px-6 font-medium text-slate-400 font-mono text-xs">
                  {new Date(r.attendanceDate).toISOString().slice(0, 10)}
                </td>
                <td className="p-4 px-6">
                  <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize ${getStatusBadge(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-4 px-6 font-medium text-slate-400">{r.remarks ?? '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="p-12 text-center text-slate-500 font-medium">
                  No attendance records found for this student.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}