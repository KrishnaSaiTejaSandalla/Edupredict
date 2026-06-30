import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classes, exams, results, students, users, subjects, classSubjects } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import ResultsClient from "./ResultsClient";

type SearchParams = {
  classId?: string;
  subjectId?: string;
  type?: string;
  month?: string;
  page?: string;
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
  const type = sp?.type || null;
  const month = sp?.month || null;
  const page = Number(sp?.page || '1');

  const classList = await db.select().from(classes);
  
  // Filter subjectList to show only those taught in the selected class (classSubjects mapping)
  let subjectList = [];
  if (classId) {
    const classSubjectRows = await db
      .select({ s: subjects })
      .from(subjects)
      .innerJoin(classSubjects, eq(classSubjects.subjectId, subjects.id))
      .where(eq(classSubjects.classId, classId))
      .orderBy(subjects.name);
    
    subjectList = classSubjectRows.map(r => r.s);
    if (subjectList.length === 0) {
      subjectList = await db.select().from(subjects).orderBy(subjects.name);
    }
  } else {
    subjectList = await db.select().from(subjects).orderBy(subjects.name);
  }

  const distinctTypes = await db
    .selectDistinct({ type: exams.type })
    .from(exams)
    .where(sql`${exams.type} is not null`);
  const dbTypes = distinctTypes.map((row) => row.type).filter(Boolean) as string[];
  const examTypeList = dbTypes.length > 0 ? dbTypes : ["Midterm", "Final", "Summative", "Weekly Test"];

  // Query distinct exam months from database
  const distinctMonths = await db
    .selectDistinct({ month: sql<string>`DATE_FORMAT(${exams.examDate}, '%Y-%m')` })
    .from(exams)
    .where(sql`${exams.examDate} is not null`)
    .orderBy(sql`DATE_FORMAT(${exams.examDate}, '%Y-%m') desc`);
  const examMonthList = distinctMonths.map((row) => row.month).filter(Boolean);

  // Strict exam query: Try (classId + subjectId + type + month) exact match.
  let examRows: (typeof exams.$inferSelect)[] = [];
  if (classId && subjectId && type && month) {
    examRows = await db
      .select()
      .from(exams)
      .where(
        and(
          eq(exams.classId, classId),
          eq(exams.subjectId, subjectId),
          eq(exams.type, type),
          eq(sql`DATE_FORMAT(${exams.examDate}, '%Y-%m')`, month)
        )
      )
      .limit(1);
  }

  const exam = examRows[0] ?? null;

  // Query total student enrollment in the selected class
  const totalStudentsInClass = classId
    ? (await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .where(eq(students.classId, classId)))[0]?.count ?? 0
    : 0;

  const resultRows = exam
    ? await db
      .select({
        result: results,
        studentName: users.name,
      })
      .from(results)
      .leftJoin(students, eq(students.id, results.studentId))
      .leftJoin(users, eq(users.id, students.userId))
      .where(eq(results.examId, exam.id))
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

  const passedStudents = resultsWithMetrics.filter(r => r.percentage >= 60).length;
  const passPercentage = resultsWithMetrics.length
    ? (passedStudents / resultsWithMetrics.length) * 100
    : 0;

  // Grade breakdown for Histogram representation
  const gradeCounts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  resultsWithMetrics.forEach((r) => {
    if (r.grade in gradeCounts) {
      gradeCounts[r.grade as keyof typeof gradeCounts]++;
    }
  });
  const maxGradeCount = Math.max(...Object.values(gradeCounts), 1);

  const limit = 10;
  const totalCount = sorted.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const paginated = sorted.slice(offset, offset + limit);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-8 text-foreground">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-500 dark:text-cyan-300 animate-pulse">Analytics</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Results</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review marks, grades, and distribution for each exam.</p>
        </div>
      </div>

      {/* Filter Row */}
      <ResultsClient classList={classList} subjectList={subjectList} examTypeList={examTypeList} examMonthList={examMonthList} />

      {/* Main Results Display */}
      {classId && subjectId && type && month ? (
        exam ? (
          <section className="space-y-8">
            {/* Summary KPI Cards Row (4 Columns) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Total Students */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-cyan-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Students</p>
                <h3 className="mt-2 text-2xl font-black text-foreground">{totalStudentsInClass}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground">Enrolled in class</p>
              </div>

              {/* 2. Average Score */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-cyan-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average Score</p>
                <h3 className="mt-2 text-2xl font-black text-cyan-500 dark:text-cyan-300">
                  {maxMarks > 0 ? `${((summary.average / maxMarks) * 100).toFixed(1)}%` : '—'}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Avg: {summary.average.toFixed(1)} / {maxMarks} marks
                </p>
              </div>

              {/* 3. Attendance Rate */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-cyan-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attendance Rate</p>
                <h3 className="mt-2 text-2xl font-black text-blue-500 dark:text-blue-400">—</h3>
                <p className="mt-1.5 text-xs text-muted-foreground">Not linked to exam</p>
              </div>

              {/* 4. Pass Percentage */}
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-cyan-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pass Percentage</p>
                <h3 className="mt-2 text-2xl font-black text-emerald-500 dark:text-emerald-400">
                  {resultsWithMetrics.length > 0 ? `${passPercentage.toFixed(1)}%` : '—'}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {passedStudents} of {summary.count} passed (≥ 60%)
                </p>
              </div>
            </div>

            {/* Exam Info Card */}
            {exam && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md hover:border-cyan-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Exam Profile</p>
                <h3 className="mt-2 text-base font-bold text-foreground truncate">{exam.name}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-cyan-500"></span>
                  Type: {exam.type || 'Standard'} &bull; Max Marks: {maxMarks}
                </p>
              </div>
            )}

            {/* Analytics Section: Grade Histogram & Score Extremes - only when results exist */}
            {resultsWithMetrics.length > 0 && (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Grade Histogram */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-6">
                    Grade Distribution Histogram
                  </h3>
                  <div className="flex items-end justify-between gap-4 h-48 pt-4 pb-2 border-b border-border">
                    {Object.entries(gradeCounts).map(([grade, count]) => {
                      const pct = (count / maxGradeCount) * 100;
                      const color = 
                        grade === 'A' ? 'bg-emerald-500 dark:bg-emerald-400 hover:bg-emerald-400 dark:hover:bg-emerald-300' :
                        grade === 'B' ? 'bg-blue-500 dark:bg-blue-400 hover:bg-blue-400 dark:hover:bg-blue-300' :
                        grade === 'C' ? 'bg-amber-500 dark:bg-amber-400 hover:bg-amber-400 dark:hover:bg-amber-300' :
                        grade === 'D' ? 'bg-orange-500 dark:bg-orange-400 hover:bg-orange-400 dark:hover:bg-orange-300' :
                        'bg-rose-500 dark:bg-rose-400 hover:bg-rose-400 dark:hover:bg-rose-300';
                      return (
                        <div key={grade} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          {/* Tooltip */}
                          <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-card border border-border text-foreground text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg z-10 pointer-events-none whitespace-nowrap">
                            {count} Student{count !== 1 ? 's' : ''} ({summary.count > 0 ? ((count / summary.count) * 100).toFixed(0) : 0}%)
                          </div>
                          {/* Bar */}
                          <div 
                            className={`w-full rounded-t-lg transition-all duration-500 ease-out ${color} cursor-pointer min-h-[4px]`}
                            style={{ height: `${summary.count > 0 ? Math.max(pct, 4) : 4}%` }}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Labels */}
                  <div className="flex justify-between gap-4 mt-3 text-center text-xs font-bold text-muted-foreground">
                    {Object.keys(gradeCounts).map((grade) => (
                      <div key={grade} className="flex-1">
                        Grade {grade}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Performance Extremes / Insights */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-6">
                      Performance Extremes
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border hover:border-cyan-500/10 transition">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Highest Score</p>
                          <p className="text-lg font-black text-emerald-500 dark:text-emerald-400 mt-0.5">
                            {summary.highest} <span className="text-xs text-muted-foreground font-medium">marks</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Student</p>
                          <p className="text-xs font-bold text-foreground mt-0.5 max-w-[110px] truncate">
                            {sorted[0]?.name ?? '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-background border border-border hover:border-cyan-500/10 transition">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Lowest Score</p>
                          <p className="text-lg font-black text-rose-500 dark:text-rose-400 mt-0.5">
                            {summary.lowest} <span className="text-xs text-muted-foreground font-medium">marks</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Student</p>
                          <p className="text-xs font-bold text-foreground mt-0.5 max-w-[110px] truncate">
                            {sorted[sorted.length - 1]?.name ?? '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/60">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Evaluation Progress</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs font-bold text-foreground">
                        {summary.count === totalStudentsInClass ? '100% Evaluated' : `${totalStudentsInClass > 0 ? ((summary.count / totalStudentsInClass) * 100).toFixed(0) : 0}% Evaluated`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {Math.max(totalStudentsInClass - summary.count, 0)} pending
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Table - check for no students first */}
            {totalStudentsInClass === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center shadow-sm">
                <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-3-3h-4m-4 0H7a4 4 0 00-4 4v2h5m4 0h5m-5 0V9a4 4 0 012-2h2" />
                </svg>
                <h3 className="mt-4 text-sm font-semibold text-foreground">No student records available.</h3>
                <p className="mt-1 text-xs text-muted-foreground">This class has no enrolled students to display results for.</p>
              </div>
            ) : resultsWithMetrics.length > 0 ? (
              <div className="overflow-auto rounded-2xl border border-border bg-card shadow-sm">
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
                  <tbody className="divide-y divide-border/65">
                    {paginated.map((result, idx) => (
                      <tr key={result.id} className="hover:bg-hover transition duration-200">
                        <td className="p-4 px-6 font-bold text-muted-foreground/70">{offset + idx + 1}</td>
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
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center shadow-sm">
                <svg className="mx-auto h-10 w-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="mt-4 text-sm font-semibold text-foreground">No marks have been entered for this exam yet.</h3>
                <p className="mt-1 text-xs text-muted-foreground">Use the marks entry page to record student scores.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pt-4 border-t border-border mt-4 w-full">
                <div>
                  {page > 1 && (
                    <a
                      href={`/admin/marks/results?classId=${classId}&subjectId=${subjectId}&type=${type}&month=${month}&page=${page - 1}`}
                      className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
                    >
                      ← Previous
                    </a>
                  )}
                </div>
                <span className="tabular-nums">Page {page} of {totalPages}</span>
                <div>
                  {page < totalPages && (
                    <a
                      href={`/admin/marks/results?classId=${classId}&subjectId=${subjectId}&type=${type}&month=${month}&page=${page + 1}`}
                      className="rounded-xl border border-border bg-card px-4 py-2.5 hover:bg-hover transition duration-150 text-foreground"
                    >
                      Next →
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center shadow-sm max-w-xl mx-auto mt-8">
            <div className="mx-auto h-12 w-12 rounded-full bg-rose-500/10 dark:bg-rose-500/5 flex items-center justify-center text-rose-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-bold text-foreground">No exams found for selected filters.</h3>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              There is no exam record matching the selected Class, Subject, Exam Type, and Month. Please adjust your filters and try again.
            </p>
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-16 text-center shadow-sm max-w-xl mx-auto mt-8">
          <div className="mx-auto h-12 w-12 rounded-full bg-cyan-500/10 dark:bg-cyan-500/5 flex items-center justify-center text-cyan-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-bold text-foreground">No Exam Selected</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Select a class, subject, exam type, and month from the filters above to retrieve current examination results, average parameters, and grade allocations.
          </p>
        </div>
      )}
    </main>
  );
}
