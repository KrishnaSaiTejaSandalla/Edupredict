export const dynamic = "force-dynamic";
export const revalidate = 0;

import { db } from "@/lib/db";
import { exams, results, subjects, classes, students, attendance } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { DynamicAnalyticsCharts } from "@/components/admin/ClientChartWrappers";
import { calculateAttendancePercentage } from "@/lib/attendance-utils";

async function getAnalyticsPageData() {
  const [
    examTrendRaw,
    subjectAvgsRaw,
    classCountsRaw,
    passTotalsRaw,
  ] = await Promise.all([
    // Performance trend: avg percentage per exam (sorted by date)
    db
      .select({
        id: exams.id,
        name: exams.name,
        maxMarks: exams.maxMarks,
        examDate: exams.examDate,
        avgMarks: sql<number>`avg(${results.marks})`,
      })
      .from(exams)
      .leftJoin(results, eq(results.examId, exams.id))
      .groupBy(exams.id, exams.name, exams.maxMarks, exams.examDate)
      .orderBy(exams.examDate),

    // Subject averages: avg percentage per subject
    db
      .select({
        subjectName: subjects.name,
        maxMarks: exams.maxMarks,
        avgMarks: sql<number>`avg(${results.marks})`,
      })
      .from(results)
      .innerJoin(exams, eq(results.examId, exams.id))
      .innerJoin(subjects, eq(exams.subjectId, subjects.id))
      .groupBy(subjects.id, subjects.name, exams.maxMarks),

    // Class student counts
    db
      .select({
        name: classes.name,
        section: classes.section,
        count: sql<number>`count(${students.id})`,
      })
      .from(classes)
      .leftJoin(students, eq(students.classId, classes.id))
      .groupBy(classes.id, classes.name, classes.section),

    // Overall pass rate
    db
      .select({
        total: sql<number>`count(*)`,
        passed: sql<number>`sum(case when (${results.marks} / nullif(${exams.maxMarks}, 0)) >= 0.4 then 1 else 0 end)`,
      })
      .from(results)
      .innerJoin(exams, eq(results.examId, exams.id)),
  ]);

  const trend = examTrendRaw.map((row) => {
    const maxM = Number(row.maxMarks) || 100;
    const avg = Number(row.avgMarks || 0);
    return {
      exam: row.name ?? "Exam",
      examDate: row.examDate
        ? new Date(row.examDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "—",
      percentage: maxM > 0 ? Math.round((avg / maxM) * 100) : 0,
    };
  });

  // Aggregate subject averages (same subject may appear across multiple exams)
  const subjectMap: Record<string, { total: number; count: number; maxMarks: number }> = {};
  for (const row of subjectAvgsRaw) {
    const key = row.subjectName ?? "Unknown";
    const maxM = Number(row.maxMarks) || 100;
    const avg = Number(row.avgMarks || 0);
    if (!subjectMap[key]) subjectMap[key] = { total: 0, count: 0, maxMarks: maxM };
    subjectMap[key].total += avg;
    subjectMap[key].count += 1;
    subjectMap[key].maxMarks = maxM;
  }

  const subjectData = Object.entries(subjectMap).map(([subject, v]) => ({
    subject,
    percentage:
      v.maxMarks > 0
        ? Math.round(((v.total / v.count) / v.maxMarks) * 100)
        : 0,
  }));

  const classData = classCountsRaw.map((row) => ({
    name: row.section ? `${row.name} ${row.section}` : (row.name ?? "Class"),
    count: Number(row.count ?? 0),
  }));

  const passRate = calculateAttendancePercentage({
    present: Number(passTotalsRaw[0]?.passed ?? 0),
    total: Number(passTotalsRaw[0]?.total ?? 0),
  });

  return { trend, subjectData, classData, passRate };
}

export default async function AnalyticsPage() {
  const { trend, subjectData, classData, passRate } =
    await getAnalyticsPageData();

  return (
    <main className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 space-y-8 transition-colors duration-200">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-400">
          Analytics
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Academic Analytics
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Analyze historical examination trends, subject performance averages, and student enrollment distributions.
        </p>
      </div>

      <div className="rounded-3xl border border-border bg-card/50 p-1 shadow-md">
        <DynamicAnalyticsCharts
          trend={trend}
          subjects={subjectData}
          classes={classData}
          passRate={passRate}
        />
      </div>
    </main>
  );
}
