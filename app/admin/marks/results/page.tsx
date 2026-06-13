import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes, exams, results, students, users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import ResultsClient from "./ResultsClient";

type SearchParams = {
  classId?: string;
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
  const examId = sp?.examId ? Number(sp.examId) : null;

  const classList = await db.select().from(classes);
  const examRows = examId ? await db.select().from(exams).where(eq(exams.id, examId)).limit(1) : [];
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
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-8 text-foreground">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-300">Results</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Results Allocation</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review marks, grades, and distribution for each exam.</p>
        </div>
        <nav className="flex items-center gap-4 text-xs font-semibold">

          <a
            href="/admin/marks"
            className="rounded-xl border border-border bg-card px-6 py-3 text-foreground shadow-sm transition-all hover:bg-hover hover:shadow-md hover:-translate-y-[1px]"
          >
            Enter Marks
          </a>

          <a
            href="/admin/marks/results"
            className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-6 py-3 text-cyan-800 dark:text-cyan-300 shadow-sm transition-all hover:shadow-md hover:-translate-y-[1px] hover:border-cyan-400"
          >
            View Results
          </a>

        </nav>
      </div>


      {/* Filter Row */}
      <ResultsClient classList={classList} />

      {/* Main Results Display */}
      {exam ? (
        <section className="space-y-6">

          {/* Summary KPI Cards Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-subtle bg-card p-5 shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Exam Details</p>
              <p className="mt-2 text-base font-bold text-foreground truncate">{exam.name}</p>
            </div>
            <div className="rounded-xl border border-subtle bg-card p-5 shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Evaluated Students</p>
              <p className="mt-2 text-base font-bold text-foreground">{summary.count}</p>
            </div>
            <div className="rounded-xl border border-subtle bg-card p-5 shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Average Percentage</p>
              <p className="mt-2 text-base font-bold text-cyan-500 dark:text-cyan-300">
                {maxMarks > 0 ? `${((summary.average / maxMarks) * 100).toFixed(1)}%` : '—'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-subtle bg-background p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Highest Score Obtained</p>
              <p className="mt-3 text-2xl font-bold text-emerald-500 dark:text-emerald-400">{summary.highest} <span className="text-xs text-muted-foreground font-medium">marks</span></p>
            </div>
            <div className="rounded-xl border border-subtle bg-background p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lowest Score Obtained</p>
              <p className="mt-3 text-2xl font-bold text-rose-500 dark:text-rose-400">{summary.lowest} <span className="text-xs text-muted-foreground font-medium">marks</span></p>
            </div>
            <div className="rounded-xl border border-subtle bg-background p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Maximum Possible Marks</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{maxMarks} <span className="text-xs text-muted-foreground font-medium">marks</span></p>
            </div>
          </div>

          {/* Grades Distribution Table */}
          <div className="overflow-auto rounded-2xl border border-border bg-card shadow-md">
            <table className="w-full text-left text-sm text-foreground">
              <thead className="border-b border-border bg-background/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4 px-6">Rank</th>
                  <th className="p-4 px-6">Student</th>
                  <th className="p-4 px-6">Marks Obtained</th>
                  <th className="p-4 px-6">Percentage</th>
                  <th className="p-4 px-6">Grade Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {sorted.map((result, index) => (
                  <tr key={result.id} className="hover:bg-hover transition duration-200">
                    <td className="p-4 px-6 font-semibold text-muted-foreground">{index + 1}</td>
                    <td className="p-4 px-6 font-bold text-foreground">{result.name}</td>
                    <td className="p-4 px-6 font-medium text-muted-foreground">{result.marks} / {maxMarks}</td>
                    <td className="p-4 px-6 font-semibold text-foreground">{result.percentage.toFixed(1)}%</td>
                    <td className="p-4 px-6">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${result.grade === 'A'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : result.grade === 'B'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : result.grade === 'C'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : result.grade === 'D'
                              ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
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
        <div className="rounded-2xl border border-dashed border-border bg-transparent p-12 text-center shadow-md">
          <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-sm font-semibold text-foreground">No exam selected</h3>
          <p className="mt-1 text-xs text-muted-foreground">Select class and exam parameters from the filter row above to review results.</p>
        </div>
      )}
    </main>
  );
}
