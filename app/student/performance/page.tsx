import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { students, aiPredictions, aiRecommendations, subjects, teacherResources, results, exams, attendance } from "@/lib/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { generateAIPredictionsForStudent } from "@/lib/prediction-engine.service";
import StudentPerformanceClient from "@/components/student/StudentPerformanceClient";

export const dynamic = "force-dynamic";

export default async function StudentPerformancePage() {
  const user = await requireRole("student");

  const [studentRow] = await db
    .select({ id: students.id, classId: students.classId })
    .from(students)
    .where(eq(students.userId, user.id))
    .limit(1);

  if (!studentRow) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center text-muted">
        Student profile not found.
      </div>
    );
  }

  // 1. Refresh AI Predictions in DB
  const predictionResult = await generateAIPredictionsForStudent(studentRow.id);

  if (predictionResult.status === "insufficient_data") {
    return (
      <StudentPerformanceClient
        data={null}
        insufficientMessage={predictionResult.message || null}
      />
    );
  }

  // 2. Query refreshed predictions
  const preds = await db
    .select({
      subjectName: subjects.name,
      currentScore: aiPredictions.currentScore,
      predictedScoreMin: aiPredictions.predictedScoreMin,
      predictedScoreMax: aiPredictions.predictedScoreMax,
      riskLevel: aiPredictions.riskLevel,
      confidence: aiPredictions.confidence,
      academicHealthScore: aiPredictions.academicHealthScore,
      attendanceImpact: aiPredictions.attendanceImpact,
      assignmentImpact: aiPredictions.assignmentImpact,
    })
    .from(aiPredictions)
    .leftJoin(subjects, eq(subjects.id, aiPredictions.subjectId))
    .where(eq(aiPredictions.studentId, studentRow.id));

  // 3. Query recommendations with mapped resources
  const recs = await db
    .select({
      id: aiRecommendations.id,
      type: aiRecommendations.type,
      title: aiRecommendations.title,
      description: aiRecommendations.description,
      resourceId: aiRecommendations.resourceId,
      resourceTitle: teacherResources.title,
      resourceFileUrl: teacherResources.fileUrl,
    })
    .from(aiRecommendations)
    .leftJoin(teacherResources, eq(teacherResources.id, aiRecommendations.resourceId))
    .where(eq(aiRecommendations.studentId, studentRow.id));

  // 4. Query trend history (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const rawTrendRows = await db
    .select({
      monthStr: sql<string>`DATE_FORMAT(${results.recordedDate}, '%Y-%m')`,
      marks: results.marks,
      examMaxMarks: exams.maxMarks,
    })
    .from(results)
    .leftJoin(exams, eq(exams.id, results.examId))
    .where(and(eq(results.studentId, studentRow.id), gte(results.recordedDate, sixMonthsAgo)));

  const trendGroups: Record<string, { totalObtained: number; totalMax: number }> = {};
  for (const row of rawTrendRows) {
    if (!row.monthStr) continue;
    const obtained = Number(row.marks) || 0;
    const maxMarks = Number(row.examMaxMarks) || 100;
    if (!trendGroups[row.monthStr]) {
      trendGroups[row.monthStr] = { totalObtained: 0, totalMax: 0 };
    }
    trendGroups[row.monthStr].totalObtained += obtained;
    trendGroups[row.monthStr].totalMax += maxMarks;
  }

  const performanceTrend = Object.entries(trendGroups)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([monthStr, val]) => {
      const [year, month] = monthStr.split('-');
      const score = val.totalMax > 0 ? Math.round((val.totalObtained / val.totalMax) * 100) : 0;
      return {
        month: new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', { month: 'short' }),
        score,
      };
    });

  // Calculate subject comparisons
  const subjectStats = preds.map(p => ({
    subject: p.subjectName || "Subject",
    score: Math.round(Number(p.currentScore)),
    predictedMin: Math.round(Number(p.predictedScoreMin)),
    predictedMax: Math.round(Number(p.predictedScoreMax)),
  }));

  // Fetch subject attendance for correlation chart
  const attendanceRows = await db
    .select({
      subjectName: subjects.name,
      status: attendance.status,
    })
    .from(attendance)
    .leftJoin(subjects, eq(subjects.id, attendance.subjectId))
    .where(eq(attendance.studentId, studentRow.id));

  const attendanceMap: Record<string, { present: number; total: number }> = {};
  for (const row of attendanceRows) {
    const sName = row.subjectName || "General";
    if (!attendanceMap[sName]) attendanceMap[sName] = { present: 0, total: 0 };
    attendanceMap[sName].total++;
    if (row.status.toLowerCase() === "present") attendanceMap[sName].present++;
  }

  const attendanceData = Object.entries(attendanceMap).map(([subject, val]) => {
    const pct = val.total > 0 ? Math.round((val.present / val.total) * 100) : 100;
    const matchedPred = preds.find(p => p.subjectName === subject);
    const score = matchedPred ? Math.round(Number(matchedPred.currentScore)) : 80;
    return { subject, attendance: pct, score };
  });

  const responsePayload = {
    overallHealth: predictionResult.overallHealth || 80,
    predictions: preds,
    recommendations: recs,
    performanceTrend,
    subjectStats,
    attendanceData,
  };

  return <StudentPerformanceClient data={responsePayload} insufficientMessage={null} />;
}
