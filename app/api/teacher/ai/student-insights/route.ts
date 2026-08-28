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
  teachers,
  classTeacherAssignments,
} from "@/lib/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireRole("teacher");
    const body = await request.json().catch(() => null);
    const studentId = body?.studentId;

    if (!Number.isInteger(Number(studentId)) || Number(studentId) < 1) {
      return NextResponse.json({ error: "studentId is required" }, { status: 400 });
    }

    const sId = Number(studentId);

    // 1. Get student & user record
    const [studentRow] = await db
      .select({
        id: students.id,
        classId: students.classId,
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

    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, user.id)).limit(1);
    if (!teacher) return NextResponse.json({ error: "Teacher record not found" }, { status: 403 });
    const [assignment] = await db
      .select({ id: classTeacherAssignments.id })
      .from(classTeacherAssignments)
      .where(and(eq(classTeacherAssignments.teacherId, teacher.id), eq(classTeacherAssignments.classId, studentRow.classId!)))
      .limit(1);
    if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Fetch student results
    const resultsRows = await db
      .select({
        marks: results.marks,
        recordedDate: results.recordedDate,
        subjectName: subjects.name,
        maxMarks: exams.maxMarks,
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

    // Group subjects with true percentage scores based on maxMarks
    const subjectMap: Record<string, { pcts: number[]; recentScores: { marks: number; maxMarks: number; examName: string; date: string }[] }> = {};
    resultsRows.forEach((r) => {
      const sName = r.subjectName || "Subject";
      if (!subjectMap[sName]) subjectMap[sName] = { pcts: [], recentScores: [] };
      const maxM = Number(r.maxMarks || 100);
      const marksNum = Number(r.marks || 0);
      const pct = maxM > 0 ? (marksNum / maxM) * 100 : marksNum;
      subjectMap[sName].pcts.push(pct);
      subjectMap[sName].recentScores.push({
        marks: marksNum,
        maxMarks: maxM,
        examName: r.examName || "Exam",
        date: r.recordedDate instanceof Date ? r.recordedDate.toISOString().split("T")[0] : String(r.recordedDate || ""),
      });
    });

    const subjectAverages = Object.entries(subjectMap).map(([subject, data]) => ({
      subject,
      avg: Math.round(data.pcts.reduce((a, b) => a + b, 0) / data.pcts.length),
      recentScorePct: Math.round(data.pcts[0] ?? 0),
      examCount: data.pcts.length,
    }));

    const sortedSubjects = [...subjectAverages].sort((a, b) => b.avg - a.avg);
    const strongSubjects = sortedSubjects.filter((s) => s.avg >= 75).map((s) => s.subject);
    const moderateSubjects = sortedSubjects.filter((s) => s.avg >= 60 && s.avg < 75).map((s) => s.subject);
    const weakSubjects = sortedSubjects.filter((s) => s.avg < 60).map((s) => s.subject);

    const overallAvg = subjectAverages.length > 0
      ? Math.round(subjectAverages.reduce((a, b) => a + b.avg, 0) / subjectAverages.length)
      : null;

    // Determine recent trend based on chronological percentages
    let trend: "improving" | "declining" | "stable" = "stable";
    if (resultsRows.length >= 4) {
      const calcPct = (r: typeof resultsRows[0]) => {
        const m = Number(r.maxMarks || 100);
        return m > 0 ? (Number(r.marks || 0) / m) * 100 : Number(r.marks || 0);
      };
      const recent = resultsRows.slice(0, 2).map(calcPct);
      const older = resultsRows.slice(2, 4).map(calcPct);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      if (recentAvg - olderAvg >= 4) trend = "improving";
      else if (olderAvg - recentAvg >= 4) trend = "declining";
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const studentContext = {
          studentName: studentRow.name,
          rollNumber: studentRow.rollNumber,
          className: `${studentRow.className} ${studentRow.classSection || ""}`,
          overallAssessmentAverage: overallAvg !== null ? `${overallAvg}%` : "No scores recorded",
          attendanceRate: `${attendancePct}% (Present: ${Math.round(presentDays)}, Total working days: ${workingDays})`,
          recentTrend: trend,
          subjectPerformanceBreakdown: subjectAverages.map(s => `${s.subject}: ${s.avg}% average (latest: ${s.recentScorePct}%)`),
          strongSubjectsList: strongSubjects.length > 0 ? strongSubjects : ["None yet - developing"],
          moderateSubjectsList: moderateSubjects.length > 0 ? moderateSubjects : ["None"],
          weakOrStrugglingSubjectsList: weakSubjects.length > 0 ? weakSubjects : ["None - on track across all subjects"],
          assignmentSubmissionCount: Number(subStats?.submitted || 0),
          mlRiskLevel: predRow?.riskLevel || "low",
          mlRecommendations: predRow?.recommendations || null,
        };

        const prompt = `You are EduPredict's AI Academic Diagnostic Specialist writing a high-precision pedagogical summary for the class teacher.
Analyze this exact student record for ${studentRow.name} (${studentContext.className}).
Base your entire diagnostic strictly on the provided real numbers. Do NOT fabricate numbers, grades, or fake subjects.

STUDENT RECORD:
${JSON.stringify(studentContext, null, 2)}

Return a JSON object with this exact schema:
{
  "performanceOverview": "2-3 sentences analyzing ${studentRow.name}'s performance. Mention their ${overallAvg}% average, ${attendancePct}% attendance, their strongest subjects (${strongSubjects.slice(0, 2).join(', ') || 'general coursework'}), and any specific areas needing improvement (${weakSubjects.join(', ') || 'maintaining consistency'}).",
  "whyThisMatters": "Evidence-grounded explanation analyzing root factors: link their attendance (${attendancePct}%) and assessment scores in ${sortedSubjects[sortedSubjects.length - 1]?.subject || 'core subjects'} to their academic pacing.",
  "recommendedActions": [
    "Specific teacher action 1 tailored to their weakest subject (${weakSubjects[0] || sortedSubjects[sortedSubjects.length - 1]?.subject || 'revision'}) or extension task",
    "Action 2 addressing attendance/engagement (${attendancePct < 75 ? 'guardian outreach on attendance' : 'targeted classroom check-in on practice tasks'})",
    "Action 3 on test prep or active revision strategy"
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
                temperature: 0.3,
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

    // Deterministic Rule-Based Fallback (Accurate & Personalized)
    const strongText = strongSubjects.length > 0
      ? `demonstrates strong mastery in ${strongSubjects.join(', ')} (averaging ${strongSubjects.map(s => subjectAverages.find(sa => sa.subject === s)?.avg + '%').join(', ')})`
      : `shows emerging competency across foundation subjects`;

    const weakText = weakSubjects.length > 0
      ? `requires targeted remediation in ${weakSubjects.join(', ')} (averaging ${weakSubjects.map(s => subjectAverages.find(sa => sa.subject === s)?.avg + '%').join(', ')})`
      : moderateSubjects.length > 0
      ? `maintains steady scores in ${moderateSubjects.join(', ')} with potential for higher mastery`
      : `is performing consistently above target across all evaluated subjects`;

    const overview = `${studentRow.name} maintains an overall assessment average of ${overallAvg !== null ? overallAvg + '%' : 'N/A'} with an attendance rate of ${attendancePct}%. Performance trajectory is currently ${trend}. The student ${strongText}, while ${weakText}.`;

    const lowestSubject = sortedSubjects[sortedSubjects.length - 1];
    const whyThisMatters = attendancePct < 75
      ? `The student's attendance is at ${attendancePct}%, which directly reduces active classroom hours and correlates with lower retention in ${lowestSubject ? lowestSubject.subject : 'recent topics'}.`
      : weakSubjects.length > 0
      ? `Assessment results indicate specific friction in ${weakSubjects.join(' & ')}, while scores in ${strongSubjects[0] || 'other subjects'} show strong fundamental comprehension.`
      : `Regular ${attendancePct}% attendance and steady test execution across all subjects provide a solid foundation for upcoming milestone assessments.`;

    const recommendedActions = [
      weakSubjects.length > 0
        ? `Assign a targeted practice module in ${weakSubjects[0]} focusing on core foundational problem-solving.`
        : strongSubjects.length > 0
        ? `Provide higher-order challenge problems in ${strongSubjects[0]} to nurture advanced competency.`
        : `Conduct a brief revision check on recent exam topics to reinforce memory retention.`,
      attendancePct < 75
        ? `Initiate a guardian conference regarding the ${attendancePct}% attendance rate to prevent further credit deficit.`
        : Number(subStats?.submitted || 0) === 0
        ? `Check on assignment submissions and assign a structured study window for outstanding practice tasks.`
        : `Conduct a 3-minute 1-on-1 check-in during class exercises to verify independent problem-solving confidence.`,
      `Establish a scheduled review milestone before the next exam cycle covering ${lowestSubject ? lowestSubject.subject : 'key topics'}.`,
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
  } catch (error) {
    console.error("Student insights generation failed:", error);
    return NextResponse.json({ error: "Student insights could not be generated" }, { status: 500 });
  }
}
