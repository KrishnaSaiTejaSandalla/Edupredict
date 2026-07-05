import { requireRole } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { db } from "@/lib/db";
import { students, results, exams, subjects, attendance, predictions } from "@/lib/schema";
import { eq, desc, and, gte, inArray, sql } from "drizzle-orm";
import ParentPerformanceClient from "@/components/parent/ParentPerformanceClient";

export const dynamic = "force-dynamic";

function percentToGrade(pct: number): string {
  if (pct >= 95) return "A+";
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 75) return "B";
  if (pct >= 70) return "B-";
  if (pct >= 65) return "C+";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

export default async function ParentPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireRole("parent");
  const childrenList = await getParentChildren(user.id);

  if (childrenList.length === 0) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        <div className="max-w-md mx-auto rounded-2xl border border-theme bg-surface p-8 space-y-4">
          <h2 className="text-lg font-bold text-primary">No Linked Profiles</h2>
          <p className="text-xs text-secondary leading-relaxed">
            No student profiles are currently linked to your parent account. Please contact the school administration to map your children.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const studentIdParam = params?.studentId;
  const selectedStudent = studentIdParam
    ? childrenList.find((c) => c.studentId === Number(studentIdParam)) || childrenList[0]
    : childrenList[0];

  const studentId = selectedStudent.studentId;
  const classId = selectedStudent.classId;

  // 1. Fetch classmate student IDs
  const classmates = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.classId, classId));

  const classStudentIds = classmates.map((c) => c.id);

  // 2. Fetch subject stats & averages for comparison
  const rawResults = await db
    .select({
      subjectId: results.subjectId,
      marks: results.marks,
      examMaxMarks: exams.maxMarks,
      subjectName: subjects.name,
    })
    .from(results)
    .leftJoin(exams, eq(exams.id, results.examId))
    .leftJoin(subjects, eq(subjects.id, results.subjectId))
    .where(eq(results.studentId, studentId));

  const classResults = classStudentIds.length > 0
    ? await db
        .select({
          subjectId: results.subjectId,
          marks: results.marks,
          maxMarks: exams.maxMarks,
        })
        .from(results)
        .leftJoin(exams, eq(results.examId, exams.id))
        .where(inArray(results.studentId, classStudentIds))
    : [];

  const subjectAverages: Record<string, { subjectName: string; studentAvg: number; classAvg: number }> = {};

  rawResults.forEach((r) => {
    if (r.subjectId && r.subjectName) {
      const key = String(r.subjectId);
      if (!subjectAverages[key]) {
        subjectAverages[key] = { subjectName: r.subjectName, studentAvg: 0, classAvg: 0 };
      }
    }
  });

  Object.keys(subjectAverages).forEach((subjIdStr) => {
    const subjId = Number(subjIdStr);

    const studentSubjRows = rawResults.filter((r) => r.subjectId === subjId);
    let studObtained = 0,
      studMax = 0;
    studentSubjRows.forEach((r) => {
      if (r.marks !== null) {
        studObtained += Number(r.marks);
        studMax += Number(r.examMaxMarks || 100);
      }
    });
    const studentAvg = studMax > 0 ? Math.round((studObtained / studMax) * 100) : 0;

    const classSubjRows = classResults.filter((r) => r.subjectId === subjId);
    let classObtained = 0,
      classMax = 0;
    classSubjRows.forEach((r) => {
      if (r.marks !== null) {
        classObtained += Number(r.marks);
        classMax += Number(r.maxMarks || 100);
      }
    });
    const classAvg = classMax > 0 ? Math.round((classObtained / classMax) * 100) : 0;

    subjectAverages[subjIdStr] = {
      subjectName: subjectAverages[subjIdStr].subjectName,
      studentAvg,
      classAvg,
    };
  });

  const subjectStats = Object.values(subjectAverages).map((s) => ({
    subject: s.subjectName,
    score: s.studentAvg,
    maxScore: 100,
    percentage: s.studentAvg,
    classAvg: s.classAvg,
  }));

  // 3. Strengths and Weaknesses lists
  const sortedStats = [...subjectStats].sort((a, b) => b.percentage - a.percentage);
  const strongSubjects = sortedStats.slice(0, Math.ceil(sortedStats.length / 2)).map((s) => s.subject);
  const weakSubjects = sortedStats.slice(-Math.ceil(sortedStats.length / 2)).map((s) => s.subject);

  // 4. Performance & Attendance monthly trend
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const trendRows = await db
    .select({
      month: sql<string>`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`,
      avg: sql<number>`AVG(CAST(${results.marks} AS DECIMAL(5,2)))`,
    })
    .from(results)
    .where(and(eq(results.studentId, studentId), gte(results.recordedDate, sixMonthsAgo)))
    .groupBy(sql`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`);

  const attTrendRows = await db
    .select({
      month: sql<string>`DATE_FORMAT(${attendance.attendanceDate}, '%Y-%m')`,
      present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)`,
      total: sql<number>`count(*)`,
    })
    .from(attendance)
    .where(and(eq(attendance.studentId, studentId), gte(attendance.attendanceDate, sixMonthsAgo)))
    .groupBy(sql`DATE_FORMAT(${attendance.attendanceDate}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${attendance.attendanceDate}, '%Y-%m')`);

  const performanceTrend = trendRows.map((r) => {
    const [year, month] = (r.month || "").split("-");
    const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleString("default", {
      month: "short",
    });
    const score = Math.round(Number(r.avg || 0));

    const attRow = attTrendRows.find((x) => x.month === r.month);
    const attendanceRate =
      attRow && Number(attRow.total) > 0
        ? Math.round((Number(attRow.present) / Number(attRow.total)) * 100)
        : 100;

    return {
      month: monthName,
      score,
      attendanceRate,
    };
  });

  // 5. Predictions & Risk Forecast
  const predictionRows = await db
    .select({
      subjectId: predictions.subjectId,
      predictedScore: predictions.predictedScore,
      riskLevel: predictions.riskLevel,
      confidence: predictions.confidence,
      subjectName: subjects.name,
    })
    .from(predictions)
    .leftJoin(subjects, eq(predictions.subjectId, subjects.id))
    .where(eq(predictions.studentId, studentId));

  const predictedGrades = subjectStats.map((s) => {
    const pred = predictionRows.find((p) => p.subjectName === s.subject);
    const score = pred ? Number(pred.predictedScore) : s.percentage;
    const risk = pred
      ? pred.riskLevel
      : s.percentage < 50
      ? "high"
      : s.percentage < 70
      ? "medium"
      : "low";

    return {
      subject: s.subject,
      currentGrade: percentToGrade(s.percentage),
      predictedGrade: percentToGrade(score),
      predictedScore: score,
      riskLevel: risk,
    };
  });

  const avgPct = subjectStats.length > 0 ? subjectStats.reduce((s, x) => s + x.percentage, 0) / subjectStats.length : 0;
  const trendDelta = performanceTrend.length >= 2
    ? performanceTrend[performanceTrend.length - 1].score - performanceTrend[0].score
    : 0;

  const confidenceScore = Math.min(99, Math.max(50, Math.round(avgPct * 0.9 + trendDelta * 0.5)));

  const buildAIParagraph = (pct: number, strong: string[], focus: string[], trend: number) => {
    const prefix =
      pct >= 85
        ? "Excellent work! Your child is showing outstanding understanding."
        : pct >= 70
        ? "Your child is doing well and is on a solid academic track."
        : "Your child is making progress but has room for growth.";
    const trendMsg =
      trend > 5
        ? "Their scores are improving rapidly."
        : trend > 0
        ? "Their scores are improving steadily."
        : trend < -5
        ? "Scores have dipped recently. Refocusing on core concepts is advised."
        : "Performance remains stable.";
    const strongMsg = strong.length > 0 ? `Strong subjects include ${strong.slice(0, 2).join(" and ")}.` : "";
    const focusMsg = focus.length > 0 ? `Focusing extra on ${focus.slice(0, 2).join(" and ")} will push averages higher.` : "";
    return `${prefix} ${trendMsg} ${strongMsg} ${focusMsg} Regular practice is key to long-term success.`;
  };

  const aiParagraph = buildAIParagraph(avgPct, strongSubjects, weakSubjects, trendDelta);

  return (
    <ParentPerformanceClient
      subjectStats={subjectStats}
      performanceTrend={performanceTrend}
      strongSubjects={strongSubjects}
      weakSubjects={weakSubjects}
      predictedGrades={predictedGrades}
      aiParagraph={aiParagraph}
      confidenceScore={confidenceScore}
      studentName={selectedStudent.name}
    />
  );
}
