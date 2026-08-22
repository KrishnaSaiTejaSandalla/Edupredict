import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  teachers, classes, students, users, attendance,
  assignments, assignmentSubmissions, results, subjects,
  classSubjects, resources,
} from "@/lib/schema";
import { eq, and, inArray, gte, lte, sql, desc, isNull, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month"); // YYYY-MM format

    const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, user.id)).limit(1);
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 403 });

    // Parse month range
    let targetYear: number;
    let targetMonth: number;
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      [targetYear, targetMonth] = monthParam.split("-").map(Number);
    } else {
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1;
    }

    const monthStart = new Date(`${targetYear}-${String(targetMonth).padStart(2, "0")}-01T00:00:00`);
    const monthEndDate = new Date(targetYear, targetMonth, 0); // last day of month
    const monthEnd = new Date(`${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(monthEndDate.getDate()).padStart(2, "0")}T23:59:59`);

    // Prior month for comparison
    const priorMonthDate = new Date(targetYear, targetMonth - 2, 1);
    const priorStart = new Date(priorMonthDate.getFullYear(), priorMonthDate.getMonth(), 1);
    const priorEnd = new Date(priorMonthDate.getFullYear(), priorMonthDate.getMonth() + 1, 0);

    const monthLabel = monthStart.toLocaleString("default", { month: "long", year: "numeric" });

    // Get teacher's assigned classes
    const classSubjRows = await db
      .select({ classId: classSubjects.classId })
      .from(classSubjects)
      .where(eq(classSubjects.teacherId, teacher.id));

    const assignedClassIds = Array.from(new Set(classSubjRows.map(r => r.classId).filter(Boolean))) as number[];

    if (assignedClassIds.length === 0) {
      return NextResponse.json({ insufficientData: true, message: "No classes assigned. Assign classes to generate monthly summaries." });
    }

    // Students in teacher's classes
    const studentRows = await db
      .select({ id: students.id, classId: students.classId, className: classes.name, classSection: classes.section })
      .from(students)
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(inArray(students.classId, assignedClassIds));

    const studentIds = studentRows.map(s => s.id);

    if (studentIds.length === 0) {
      return NextResponse.json({ insufficientData: true, message: `No students in your classes for ${monthLabel}.` });
    }

    // 1. Attendance this month
    const attRows = await db
      .select({
        studentId: attendance.studentId,
        status: attendance.status,
        count: sql<number>`count(*)`,
      })
      .from(attendance)
      .where(and(inArray(attendance.studentId, studentIds), gte(attendance.attendanceDate, monthStart), lte(attendance.attendanceDate, monthEnd)))
      .groupBy(attendance.studentId, attendance.status);

    const attTotalMap = new Map<number, number>();
    const attPresentMap = new Map<number, number>();
    attRows.forEach(r => {
      attTotalMap.set(r.studentId, (attTotalMap.get(r.studentId) || 0) + Number(r.count));
      if (r.status === "present") attPresentMap.set(r.studentId, (attPresentMap.get(r.studentId) || 0) + Number(r.count));
      if (r.status === "half_day") attPresentMap.set(r.studentId, (attPresentMap.get(r.studentId) || 0) + Number(r.count) * 0.5);
    });

    const studentsWithAttendance = studentIds.filter(id => (attTotalMap.get(id) || 0) > 0);
    let avgAttendance = 0;
    if (studentsWithAttendance.length > 0) {
      avgAttendance = Math.round(
        studentsWithAttendance.reduce((sum, id) => {
          const total = attTotalMap.get(id) || 0;
          const present = attPresentMap.get(id) || 0;
          return sum + (total > 0 ? (present / total) * 100 : 0);
        }, 0) / studentsWithAttendance.length
      );
    }

    // Students with low attendance (<75%) this month
    const lowAttStudentIds = studentIds.filter(id => {
      const total = attTotalMap.get(id) || 0;
      const present = attPresentMap.get(id) || 0;
      return total > 5 && (present / total) * 100 < 75;
    });

    // 2. Marks / Results this month
    const marksRows = await db
      .select({ studentId: results.studentId, marks: results.marks, subjectName: subjects.name, recordedDate: results.recordedDate })
      .from(results)
      .leftJoin(subjects, eq(results.subjectId, subjects.id))
      .where(and(inArray(results.studentId, studentIds), gte(results.recordedDate, monthStart), lte(results.recordedDate, monthEnd)));

    // Prior month marks for comparison
    const priorMarksRows = await db
      .select({ studentId: results.studentId, marks: results.marks })
      .from(results)
      .where(and(inArray(results.studentId, studentIds), gte(results.recordedDate, priorStart), lte(results.recordedDate, priorEnd)));

    const currentScores = marksRows.map(r => Number(r.marks || 0));
    const priorScores = priorMarksRows.map(r => Number(r.marks || 0));
    const avgMarksThis = currentScores.length > 0 ? Math.round(currentScores.reduce((a, b) => a + b, 0) / currentScores.length) : null;
    const avgMarksPrior = priorScores.length > 0 ? Math.round(priorScores.reduce((a, b) => a + b, 0) / priorScores.length) : null;

    // Students improving vs declining (score trend)
    const studentScoreMap = new Map<number, number[]>();
    marksRows.forEach(r => {
      if (!studentScoreMap.has(r.studentId)) studentScoreMap.set(r.studentId, []);
      studentScoreMap.get(r.studentId)!.push(Number(r.marks || 0));
    });
    const priorStudentScoreMap = new Map<number, number[]>();
    priorMarksRows.forEach(r => {
      if (!priorStudentScoreMap.has(r.studentId)) priorStudentScoreMap.set(r.studentId, []);
      priorStudentScoreMap.get(r.studentId)!.push(Number(r.marks || 0));
    });

    let improvingCount = 0, decliningCount = 0;
    studentIds.forEach(id => {
      const curr = studentScoreMap.get(id);
      const prior = priorStudentScoreMap.get(id);
      if (!curr || !prior || curr.length === 0 || prior.length === 0) return;
      const currAvg = curr.reduce((a, b) => a + b, 0) / curr.length;
      const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
      if (currAvg - priorAvg >= 5) improvingCount++;
      else if (priorAvg - currAvg >= 5) decliningCount++;
    });

    // Subject performance this month
    const subjectScores: Record<string, number[]> = {};
    marksRows.forEach(r => {
      const sn = r.subjectName || "Unknown";
      if (!subjectScores[sn]) subjectScores[sn] = [];
      subjectScores[sn].push(Number(r.marks || 0));
    });
    const subjectAverages = Object.entries(subjectScores)
      .map(([subject, scores]) => ({ subject, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length }))
      .sort((a, b) => a.avg - b.avg);

    // 3. Assignments this month
    const [assignRow] = await db
      .select({ total: sql<number>`count(*)` })
      .from(assignments)
      .where(and(eq(assignments.teacherId, teacher.id), gte(assignments.createdAt, monthStart), lte(assignments.createdAt, monthEnd)));

    const [subRow] = await db
      .select({
        submitted: sql<number>`count(*)`,
        graded: sql<number>`SUM(CASE WHEN ${assignmentSubmissions.grade} IS NOT NULL THEN 1 ELSE 0 END)`,
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
      .where(and(eq(assignments.teacherId, teacher.id), gte(assignmentSubmissions.submittedAt, monthStart), lte(assignmentSubmissions.submittedAt, monthEnd)));

    const assignmentsCreated = Number(assignRow?.total || 0);
    const submissionsReceived = Number(subRow?.submitted || 0);
    const submissionsGraded = Number(subRow?.graded || 0);
    const gradingRate = submissionsReceived > 0 ? Math.round((submissionsGraded / submissionsReceived) * 100) : 100;

    // 4. Resources uploaded this month
    const [resRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(resources)
      .where(and(eq(resources.teacherId, teacher.id), gte(resources.createdAt, monthStart), lte(resources.createdAt, monthEnd)));

    const resourcesUploaded = Number(resRow?.count || 0);

    // Check if we have enough data
    const hasData = attRows.length > 0 || marksRows.length > 0 || assignmentsCreated > 0;
    if (!hasData) {
      return NextResponse.json({
        insufficientData: true,
        month: monthLabel,
        message: `Not enough data recorded for ${monthLabel}. Mark attendance, enter marks, and create assignments to generate a monthly summary.`,
      });
    }

    // Build structured summary data
    const summaryData = {
      month: monthLabel,
      teacherName: user.name,
      totalStudents: studentIds.length,
      totalClasses: assignedClassIds.length,
      attendance: {
        avgRate: avgAttendance,
        sessionsRecorded: attRows.length > 0 ? studentsWithAttendance.length : 0,
        lowAttendanceStudents: lowAttStudentIds.length,
      },
      performance: {
        avgMarksThisMonth: avgMarksThis,
        avgMarksPriorMonth: avgMarksPrior,
        assessmentsRecorded: marksRows.length,
        improvingStudents: improvingCount,
        decliningStudents: decliningCount,
        weakestSubject: subjectAverages[0]?.subject || null,
        weakestSubjectAvg: subjectAverages[0]?.avg || null,
        strongestSubject: subjectAverages[subjectAverages.length - 1]?.subject || null,
        strongestSubjectAvg: subjectAverages[subjectAverages.length - 1]?.avg || null,
      },
      assignments: {
        created: assignmentsCreated,
        submissionsReceived,
        submissionsGraded,
        gradingRate,
      },
      resourcesUploaded,
    };

    // Generate narrative with Gemini or deterministic
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    let narrative = "";

    if (apiKey) {
      try {
        const prompt = `You are EduPredict's AI teaching analyst. Generate a concise, warm, and professional monthly teaching summary for ${user.name} based on this real data.

DATA FOR ${monthLabel}:
${JSON.stringify(summaryData, null, 2)}

Write a structured summary in Markdown with these EXACT sections:
## 📊 This Month in Numbers
## 🏫 Class Performance
## 📋 Attendance Overview
## ✅ Assignments & Grading
## 🔍 Key Observations
## 💡 Recommendations for Next Month

Rules:
- Use ONLY the data provided — do NOT invent numbers
- Write like a knowledgeable colleague, not a robot
- Keep each section brief (3-5 bullet points or 2-3 sentences)
- If a metric shows improvement, celebrate it briefly
- If a metric shows decline, be direct but constructive`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1200 } }) }
        );

        if (response.ok) {
          const data = await response.json();
          narrative = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch (e) {
        console.error("Gemini monthly summary failed, using deterministic:", e);
      }
    }

    // Deterministic narrative fallback
    if (!narrative) {
      const marksTrend = avgMarksThis !== null && avgMarksPrior !== null
        ? avgMarksThis > avgMarksPrior ? `↑ up ${avgMarksThis - avgMarksPrior} points from last month`
        : avgMarksThis < avgMarksPrior ? `↓ down ${avgMarksPrior - avgMarksThis} points from last month`
        : "unchanged from last month"
        : "";

      narrative = `## 📊 This Month in Numbers
- **Students:** ${studentIds.length} across ${assignedClassIds.length} class${assignedClassIds.length > 1 ? "es" : ""}
- **Average Attendance:** ${avgAttendance > 0 ? avgAttendance + "%" : "Not enough data"}
- **Assessments Recorded:** ${marksRows.length}
- **Avg Score:** ${avgMarksThis !== null ? avgMarksThis + "% " + marksTrend : "No assessments recorded"}
- **Assignments Created:** ${assignmentsCreated} | Submissions: ${submissionsReceived} | Graded: ${submissionsGraded} (${gradingRate}%)
- **Resources Uploaded:** ${resourcesUploaded}

## 🏫 Class Performance
${avgMarksThis !== null ? `- Overall class average this month: **${avgMarksThis}%**${avgMarksPrior !== null ? ` (${marksTrend})` : ""}` : "- No assessment scores recorded this month."}
${subjectAverages[0] ? `- Weakest subject: **${subjectAverages[0].subject}** at ${subjectAverages[0].avg}% average — consider targeted revision` : ""}
${subjectAverages.length > 1 ? `- Strongest subject: **${subjectAverages[subjectAverages.length - 1].subject}** at ${subjectAverages[subjectAverages.length - 1].avg}%` : ""}
${improvingCount > 0 ? `- **${improvingCount} student${improvingCount > 1 ? "s" : ""} improved** compared to last month — great progress!` : ""}
${decliningCount > 0 ? `- **${decliningCount} student${decliningCount > 1 ? "s" : ""} declined** — review their recent assignment and attendance patterns` : ""}

## 📋 Attendance Overview
${avgAttendance > 0 ? `- Class average attendance: **${avgAttendance}%**` : "- Attendance not yet recorded for this month."}
${lowAttStudentIds.length > 0 ? `- **${lowAttStudentIds.length} student${lowAttStudentIds.length > 1 ? "s" : ""} below 75% attendance** — guardian outreach recommended` : "- All students maintain attendance above 75%."}

## ✅ Assignments & Grading
${assignmentsCreated > 0 ? `- Created **${assignmentsCreated} assignment${assignmentsCreated > 1 ? "s" : ""}** this month` : "- No new assignments created this month."}
${submissionsReceived > 0 ? `- Received **${submissionsReceived} submission${submissionsReceived > 1 ? "s" : ""}**, graded **${submissionsGraded}** (${gradingRate}% grading rate)` : "- No submissions received this month."}
${gradingRate < 80 && submissionsReceived > 0 ? "- ⚠️ Grading rate below 80% — timely feedback matters for student motivation." : ""}

## 🔍 Key Observations
${decliningCount > 0 && avgMarksThis !== null && avgMarksPrior !== null && avgMarksThis < avgMarksPrior ? `- Overall average has dipped this month. Check if a difficult exam or chapter may be responsible.` : ""}
${lowAttStudentIds.length > 0 ? `- ${lowAttStudentIds.length} student${lowAttStudentIds.length > 1 ? "s are" : " is"} at attendance risk — follow up before it affects academic eligibility.` : "- No attendance concerns this month."}
${subjectAverages[0] && subjectAverages[0].avg < 55 ? `- ${subjectAverages[0].subject} averages are below 55% — consider deploying remedial material from the AI Builder.` : ""}

## 💡 Recommendations for Next Month
1. ${decliningCount > 0 ? `Review and support the ${decliningCount} declining student${decliningCount > 1 ? "s" : ""} with targeted revision material` : "Maintain current teaching cadence — performance is stable"}
2. ${gradingRate < 80 ? "Clear grading backlog early in the month to provide timely feedback" : "Continue maintaining your strong grading pace"}
3. ${subjectAverages[0] ? `Run a focused revision session for ${subjectAverages[0].subject} at the start of next month` : "Continue monitoring subject performance across classes"}`;
    }

    return NextResponse.json({
      insufficientData: false,
      month: monthLabel,
      narrative,
      rawData: summaryData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate monthly summary" }, { status: 500 });
  }
}
