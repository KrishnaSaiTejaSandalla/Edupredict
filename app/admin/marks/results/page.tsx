import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes, exams, results, students, subjects, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

type SearchParams = {
  classId?: string;
  subjectId?: string;
  examId?: string;
};

type Props = {
  searchParams: Promise<SearchParams>;
};

function getGrade(percentage: number) {
  if (percentage >= 90) return 'A';
  if (percentage >= 80) return 'B';
  if (percentage >= 70) return 'C';
  if (percentage >= 60) return 'D';
  return 'F';
}

export default async function ResultsPage({ searchParams }: Props) {
  await requireRole('admin');

  const sp = await searchParams;
  const classId = sp?.classId ? Number(sp.classId) : null;
  const subjectId = sp?.subjectId ? Number(sp.subjectId) : null;
  const examId = sp?.examId ? Number(sp.examId) : null;

  const [classList, subjectList, examList, examRows] = await Promise.all([
    db.select().from(classes),
    db.select().from(subjects),
    db.select().from(exams),
    examId ? db.select().from(exams).where(eq(exams.id, examId)).limit(1) : Promise.resolve([]),
  ]);

  const exam = examRows[0] ?? null;
  const resultRows = examId
    ? await db
        .select({
          result: results,
          studentName: users.name,
        })
        .from(results)
        .leftJoin(students, eq(students.id, results.studentId))
        .leftJoin(users, eq(users.id, students.userId))
        .where(eq(results.examId, examId))
    : [];

  const maxMarks = exam ? Number(exam.maxMarks) : 0;
  const resultsWithMetrics = resultRows.map((row) => {
    const result = row.result;
    const marks = Number(result.marks);
    const percentage = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
    return {
      ...result,
      name: row.studentName ?? 'Unknown',
      marks,
      percentage,
      grade: getGrade(percentage),
    };
  });

  const sorted = [...resultsWithMetrics].sort((a, b) => b.marks - a.marks);
  const summary = {
    count: resultsWithMetrics.length,
    average: resultsWithMetrics.length
      ? resultsWithMetrics.reduce((sum, item) => sum + item.marks, 0) / resultsWithMetrics.length
      : 0,
    highest: sorted[0]?.marks ?? 0,
    lowest: sorted[sorted.length - 1]?.marks ?? 0,
  };

  return (
    <main className="min-h-screen bg-[#070b16] p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-400">Results</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">Results Allocation</h1>
          <p className="mt-2 text-sm text-slate-400">Review marks, grades, and distribution for each exam.</p>
        </div>
        <nav className="flex gap-2.5 text-xs font-bold">
          <a
            href="/admin/marks"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4.5 py-2.5 text-slate-200 transition hover:bg-white/[0.08]"
          >
            Enter Marks
          </a>
          <a
            href="/admin/marks/results"
            className="rounded-xl border border-blue-500/20 bg-blue-500/15 px-4.5 py-2.5 text-blue-300"
          >
            View Results
          </a>
        </nav>
      </div>

      {/* Filter panel */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] p-6 shadow-xl shadow-black/20">
        <form className="grid gap-5 md:grid-cols-4" action="/admin/marks/results" method="get">
          <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Class</span>
            <select
              name="classId"
              defaultValue={classId ?? ''}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3.5 text-sm text-white outline-none cursor-pointer focus:border-cyan-400/50"
            >
              <option value="">Choose class</option>
              {classList.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.section ? `(${cls.section})` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Subject</span>
            <select
              name="subjectId"
              defaultValue={subjectId ?? ''}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3.5 text-sm text-white outline-none cursor-pointer focus:border-cyan-400/50"
            >
              <option value="">Choose subject</option>
              {subjectList.map((subject) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Exam</span>
            <select
              name="examId"
              defaultValue={examId ?? ''}
              className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1020] px-3.5 text-sm text-white outline-none cursor-pointer focus:border-cyan-400/50"
            >
              <option value="">Choose exam</option>
              {examList.map((examItem) => (
                <option key={examItem.id} value={examItem.id}>
                  {examItem.name} ({new Date(examItem.examDate).toLocaleDateString()})
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </section>

      {/* Main Results Display */}
      {exam ? (
        <section className="space-y-6">
          
          {/* Summary KPI Cards Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-gradient-to-br from-slate-950/20 to-white/[0.015] p-5 shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Exam Details</p>
              <p className="mt-2 text-base font-bold text-white truncate">{exam.name}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-gradient-to-br from-slate-950/20 to-white/[0.015] p-5 shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Evaluated Students</p>
              <p className="mt-2 text-base font-bold text-white">{summary.count}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-gradient-to-br from-slate-950/20 to-white/[0.015] p-5 shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Average Percentage</p>
              <p className="mt-2 text-base font-bold text-cyan-400">
                {maxMarks > 0 ? `${((summary.average / maxMarks) * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Highest Score Obtained</p>
              <p className="mt-3 text-2xl font-bold text-emerald-400">{summary.highest} <span className="text-xs text-slate-500 font-medium">marks</span></p>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Lowest Score Obtained</p>
              <p className="mt-3 text-2xl font-bold text-rose-400">{summary.lowest} <span className="text-xs text-slate-500 font-medium">marks</span></p>
            </div>
            <div className="rounded-xl border border-white/5 bg-[#0b1020]/40 p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Maximum Possible Marks</p>
              <p className="mt-3 text-2xl font-bold text-white">{maxMarks} <span className="text-xs text-slate-500 font-medium">marks</span></p>
            </div>
          </div>

          {/* Grades Distribution Table */}
          <div className="overflow-auto rounded-2xl border border-white/10 bg-gradient-to-br from-slate-950/40 to-white/[0.035] shadow-xl shadow-black/25">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 bg-[#070b16]/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="p-4 px-6">Rank</th>
                  <th className="p-4 px-6">Student</th>
                  <th className="p-4 px-6">Marks Obtained</th>
                  <th className="p-4 px-6">Percentage</th>
                  <th className="p-4 px-6">Grade Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sorted.map((result, index) => (
                  <tr key={result.id} className="hover:bg-white/[0.02] transition duration-200">
                    <td className="p-4 px-6 font-semibold text-slate-400">{index + 1}</td>
                    <td className="p-4 px-6 font-bold text-white">{result.name}</td>
                    <td className="p-4 px-6 font-medium text-slate-300">{result.marks} / {maxMarks}</td>
                    <td className="p-4 px-6 font-semibold text-white">{result.percentage.toFixed(1)}%</td>
                    <td className="p-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        result.grade === 'A'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : result.grade === 'B'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : result.grade === 'C'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : result.grade === 'D'
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {result.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-transparent p-12 text-center shadow-xl shadow-black/25">
          <svg className="mx-auto h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-white">No exam selected</h3>
          <p className="mt-1 text-xs text-slate-500">Select class, subject, and exam parameters from the filter row above to review results.</p>
        </div>
      )}
    </main>
  );
}
