import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  students,
  users,
  classes,
  attendance,
  results,
  subjects,
  exams,
  assignments,
  assignmentSubmissions,
  predictions,
} from "@/lib/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireRole("teacher");
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const sId = Number(studentId);

    // 1. Get student & user record
    const [studentRow] = await db
      .select({
        id: students.id,
        name: users.name,
        rollNumber: students.rollNumber,
        className: classes.name,
        classSection: classes.section,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(eq(students.id, sId))
      .limit(1);

    if (!studentRow) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 2. Fetch student results
    const resultsRows = await db
      .select({
        marks: results.marks,
        recordedDate: results.recordedDate,
        subjectName: subjects.name,
        maxMarks: subjects.maxMarks,
        examName: exams.name,
      })
      .from(results)
      .leftJoin(subjects, eq(results.subjectId, subjects.id))
      .leftJoin(exams, eq(results.examId, exams.id))
      .where(eq(results.studentId, sId))
      .orderBy(desc(results.recordedDate))
      .limit(20);

    // 3. Fetch attendance stats
    const [attStats] = await db
      .select({
        total: sql<number>`count(*)`,
        present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)`,
        halfDay: sql<number>`SUM(CASE WHEN ${attendance.status} = 'half_day' THEN 1 ELSE 0 END)`,
        absent: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)`,
        leave: sql<number>`SUM(CASE WHEN ${attendance.status} = 'leave' THEN 1 ELSE 0 END)`,
      })
      .from(attendance)
      .where(eq(attendance.studentId, sId));

    const totalDays = Number(attStats?.total || 0);
    const presentDays = Number(attStats?.present || 0) + Number(attStats?.halfDay || 0) * 0.5;
    const workingDays = totalDays - Number(attStats?.leave || 0);
    const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 100;

    // 4. Fetch assignments status
    const [subStats] = await db
      .select({
        submitted: sql<number>`count(*)`,
        graded: sql<number>`SUM(CASE WHEN ${assignmentSubmissions.grade} IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(assignmentSubmissions)
      .where(eq(assignmentSubmissions.studentId, sId));

    // 5. Fetch ML prediction
    const [predRow] = await db
      .select()
      .from(predictions)
      .where(eq(predictions.studentId, sId))
      .orderBy(desc(predictions.predictionDate))
      .limit(1);

    // Check if sufficient data exists
    if (resultsRows.length === 0 && totalDays === 0) {
      return NextResponse.json({
        insufficientData: true,
        message: "Insufficient historical data exists for this student. Record assessment marks or attendance to enable evidence-based AI insights.",
      });
    }

    // Group subjects
    const subjectMap: Record<string, number[]> = {};
    resultsRows.forEach((r) => {
      const sName = r.subjectName || "Subject";
      if (!subjectMap[sName]) subjectMap[sName] = [];
      subjectMap[sName].push(Number(r.marks || 0));
    });

    const subjectAverages = Object.entries(subjectMap).map(([subject, scores]) => ({
      subject,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      recent: scores[0],
    }));

    const sortedSubjects = [...subjectAverages].sort((a, b) => b.avg - a.avg);
    const strongSubjects = sortedSubjects.filter((s) => s.avg >= 70).map((s) => s.subject);
    const weakSubjects = sortedSubjects.filter((s) => s.avg < 60).map((s) => s.subject);

    const overallAvg = subjectAverages.length > 0
      ? Math.round(subjectAverages.reduce((a, b) => a + b.avg, 0) / subjectAverages.length)
      : null;

    // Determine recent trend
    let trend: "improving" | "declining" | "stable" = "stable";
    if (resultsRows.length >= 4) {
      const recent = resultsRows.slice(0, 2).map((r) => Number(r.marks));
      const older = resultsRows.slice(2, 4).map((r) => Number(r.marks));
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      if (recentAvg - olderAvg >= 5) trend = "improving";
      else if (olderAvg - recentAvg >= 5) trend = "declining";
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const studentContext = {
          studentName: studentRow.name,
          className: `${studentRow.className} ${studentRow.classSection || ""}`,
          overallAvg: overallAvg !== null ? `${overallAvg}%` : "No scores",
          attendanceRate: `${attendancePct}% (Working days: ${workingDays})`,
          subjectBreakdown: subjectAverages,
          strongSubjects,
          weakSubjects,
          trend,
          assignmentSubmissionsCount: Number(subStats?.submitted || 0),
          mlRisk: predRow?.riskLevel || "low",
          mlRecommendations: predRow?.recommendations || null,
        };

        const prompt = `You are EduPredict's Academic Diagnostic AI. Analyze the following actual database record for student ${studentRow.name}.
Do NOT invent fake scores or make medical/psychological claims. Ground all conclusions strictly in the data.

STUDENT RECORD:
${JSON.stringify(studentContext, null, 2)}

Return a JSON response with the following exact keys:
{
  "performanceOverview": "Concise 2-sentence summary of overall trajectory, strong areas and weak points.",
  "whyThisMatters": "Evidence-grounded explanation of contributing factors (e.g. attendance correlation, specific subject drops, or assignment gaps).",
  "recommendedActions": [
    "Practical teacher action 1 (e.g. revision recommendation, targeted worksheet)",
    "Practical teacher action 2 (e.g. assignment recovery, 1-on-1 check-in)",
    "Practical teacher action 3 (e.g. attendance follow-up or challenge tasks)"
  ]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            return NextResponse.json({
              insufficientData: false,
              overview: parsed.performanceOverview,
              whyThisMatters: parsed.whyThisMatters,
              recommendedActions: parsed.recommendedActions,
              strongSubjects,
              weakSubjects,
              trend,
              attendancePct,
              overallAvg,
            });
          }
        }
      } catch (err) {
        console.error("Gemini student insights failed, falling back to deterministic engine:", err);
      }
    }

    // Deterministic Rule-Based Fallback
    const overview = `${studentRow.name} maintains an overall assessment average of ${overallAvg !== null ? overallAvg + '%' : 'N/A'} with an attendance rate of ${attendancePct}%. Performance trajectory is currently ${trend}, with notable strength in ${strongSubjects.length > 0 ? strongSubjects.join(', ') : 'foundational coursework'} and lower marks in ${weakSubjects.length > 0 ? weakSubjects.join(', ') : 'none'}.`;

    const whyThisMatters = attendancePct < 75
      ? `The student's attendance is at ${attendancePct}%, which directly reduces classroom instructional contact and correlates with lower scores on recent evaluations.`
      : weakSubjects.length > 0
      ? `Assessment results indicate specific concept friction in ${weakSubjects.join(' & ')}, while other subject areas remain stable.`
      : `The student demonstrates steady academic consistency across active subjects with regular attendance.`;

    const recommendedActions = [
      weakSubjects.length > 0
        ? `Assign a 5-question remedial practice worksheet in ${weakSubjects[0]} to reinforce core concepts.`
        : `Provide extension and application problems to challenge strong understanding in ${strongSubjects[0] || 'active subjects'}.`,
      attendancePct < 80
        ? `Initiate an attendance follow-up with the student and guardian regarding recent absences.`
        : `Conduct a brief 3-minute 1-on-1 check-in during guided practice to confirm assignment pacing.`,
      `Review upcoming test preparation milestones to ensure balanced study across all subject areas.`,
    ];

    return NextResponse.json({
      insufficientData: false,
      overview,
      whyThisMatters,
      recommendedActions,
      strongSubjects,
      weakSubjects,
      trend,
      attendancePct,
      overallAvg,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate student insights" }, { status: 500 });
  }
}
