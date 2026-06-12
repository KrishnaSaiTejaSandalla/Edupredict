import { requireRole, getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { attendance, classes, students, users } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification-actions';
import { parseDbError } from '@/lib/db-errors';
import AttendanceForm from '@/components/admin/AttendanceForm';

type SearchParams = {
  classId?: string;
  date?: string;
};

type Props = {
  searchParams: Promise<{
    classId?: string;
    date?: string;
  }>;
};

export default async function AttendancePage({
  searchParams,
}: Props) {
  await requireRole('admin');

  const sp = await searchParams;

  const classId = sp?.classId ? Number(sp.classId) : null;
  const date =
    sp?.date || new Date().toISOString().slice(0, 10);

  const classList = await db
    .select()
    .from(classes);

  const studentsForClass = classId
    ? await db
      .select({ s: students, u: users })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .where(eq(students.classId, classId))
      .orderBy(students.rollNumber)
    : [];

  const attendanceDate = new Date(date);

  const attendanceRows = classId
    ? await db
      .select()
      .from(attendance)
      .where(eq(attendance.classId, classId))
    : [];

  const existingStatus = attendanceRows.reduce((acc, row) => {
    const rowDate = new Date(row.attendanceDate)
      .toISOString()
      .slice(0, 10);

    if (rowDate === date) {
      acc[row.studentId] = row.status;
    }

    return acc;
  }, {} as Record<number, string>);

  const totalStudents = studentsForClass.length;
  const presentCount = Object.values(existingStatus).filter((status) => status === 'present').length;
  const absentCount = Object.values(existingStatus).filter((status) => status === 'absent').length;
  const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  // Calculate At-Risk Students (< 75% overall attendance in this class)
  let atRiskCount = 0;
  if (classId && totalStudents > 0) {
    const studentStats = studentsForClass.reduce((acc, row) => {
      acc[row.s.id] = { present: 0, total: 0 };
      return acc;
    }, {} as Record<number, { present: number; total: number }>);

    attendanceRows.forEach((row) => {
      if (studentStats[row.studentId]) {
        studentStats[row.studentId].total += 1;
        if (row.status === 'present') {
          studentStats[row.studentId].present += 1;
        }
      }
    });

    Object.values(studentStats).forEach((stats) => {
      if (stats.total > 0) {
        const pct = (stats.present / stats.total) * 100;
        if (pct < 75) {
          atRiskCount++;
        }
      }
    });
  }

  async function saveAttendance(formData: FormData) {
    'use server';

    const classIdValue = Number(formData.get('classId'));
    const dateValue = String(formData.get('date'));
    const attendanceDate = new Date(dateValue);

    const studentIds = formData
      .getAll('studentId')
      .map((value) => Number(value));

    const currentUser = await getCurrentUser();
    const markedBy = currentUser?.id || null;

    if (!classIdValue || !dateValue) {
      throw new Error('Class and date are required.');
    }

    try {
      const existing = await db
        .select()
        .from(attendance)
        .where(eq(attendance.classId, classIdValue));

      const existingMap = existing
        .filter(
          (row) =>
            new Date(row.attendanceDate)
              .toISOString()
              .slice(0, 10) === dateValue
        )
        .reduce((acc, row) => {
          acc[row.studentId] = row;
          return acc;
        }, {} as Record<number, (typeof existing)[number]>);

      for (const studentId of studentIds) {
        const status = String(
          formData.get(`status-${studentId}`) || 'absent'
        );

        const record = existingMap[studentId];

        if (record) {
          await db
            .update(attendance)
            .set({
              status,
              remarks: null,
              markedBy,
            })
            .where(eq(attendance.id, record.id));
        } else {
          await db.insert(attendance).values({
            studentId,
            classId: classIdValue,
            attendanceDate,
            status,
            remarks: null,
            markedBy,
          });
        }
      }
    } catch (err) {
      throw new Error(parseDbError(err));
    }

    await createNotification('Attendance Marked', `Attendance for class has been successfully recorded.`, 'info', 'medium');

    revalidatePath('/admin/attendance');
    revalidatePath('/admin/attendance/history');
    revalidatePath('/admin/attendance/summary');
  }

  const activeTabCls = "rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2.5 text-cyan-400 font-bold shadow-md shadow-cyan-500/5 transition";
  const inactiveTabCls = "rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-slate-400 hover:text-white hover:bg-white/[0.06] transition";

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Database</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Attendance</h1>
          <p className="mt-2 text-sm text-slate-400">Track, monitor, and manage student attendance records.</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-xs">
          <a href="/admin/attendance" className={activeTabCls}>Take Attendance</a>
          <a href="/admin/attendance/history" className={inactiveTabCls}>History</a>
          <a href="/admin/attendance/summary" className={inactiveTabCls}>Summary</a>
          <a href="/admin/attendance/reports" className={inactiveTabCls}>Reports</a>
        </nav>
      </div>

      {/* DASHBOARD METRICS */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Students</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-white">{classId ? totalStudents : '—'}</p>
            <span className="text-xs font-medium text-slate-400">Enrolled</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Present Today</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-emerald-400">{classId ? presentCount : '—'}</p>
            <span className="text-xs font-medium text-emerald-400/80">Active</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Absent Today</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-rose-500">{classId ? absentCount : '—'}</p>
            <span className="text-xs font-medium text-rose-500/80">Leave/Absent</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance Rate</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-cyan-400">{classId ? `${attendanceRate}%` : '—'}</p>
            <span className="text-xs font-medium text-cyan-400/80">Overall</span>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-5 shadow-xl shadow-black/25">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">At-Risk Students</p>
          <div className="flex items-baseline justify-between mt-3">
            <p className="text-3xl font-bold text-amber-500">{classId ? atRiskCount : '—'}</p>
            <span className="text-xs font-medium text-amber-500/80">&lt; 75% Rate</span>
          </div>
        </div>
      </section>

      {/* FILTER CONTROLS */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
        <form className="grid gap-5 sm:grid-cols-3" action="/admin/attendance" method="get">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Class Selection</label>
            <select name="classId" defaultValue={classId ?? ''} className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3.5 text-sm text-white outline-none transition focus:border-cyan-400/50 cursor-pointer">
              <option value="">Choose Class</option>
              {classList.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name} {cls.section ? `(${cls.section})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Date</label>
            <input
              name="date"
              type="date"
              defaultValue={date}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020]/60 px-3.5 text-sm text-white outline-none transition focus:border-cyan-400/50 cursor-pointer"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className="h-11 w-full rounded-xl bg-blue-500 px-5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-400 hover:scale-[1.02] active:scale-[0.98] transition duration-200">
              Load Students
            </button>
          </div>
        </form>
      </section>

      {/* ATTENDANCE MARKING TABLE / FORM */}
      {classId ? (
        <section className="space-y-6 animate-in fade-in duration-300">
          <AttendanceForm
            students={studentsForClass.map((row) => ({ id: row.s.id, name: row.u.name, rollNumber: row.s.rollNumber }))}
            existingStatus={existingStatus}
            action={saveAttendance}
            classId={classId}
            date={date}
          />
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 p-12 text-center shadow-xl shadow-black/25">
          <svg className="mx-auto h-10 w-10 text-slate-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-white">No class loaded</h3>
          <p className="mt-1 text-xs text-slate-500">Choose a class and date from filters to begin tracking attendance.</p>
        </div>
      )}
    </main>
  );
}
