import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  teachers, classes, students, users, attendance,
  assignments, assignmentSubmissions, results, subjects,
  predictions, classSubjects, exams,
} from "@/lib/schema";
import { eq, and, inArray, desc, gte, sql, isNull, lt } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ─── GET — Auto-generated proactive insights (no query required) ─────────────
export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");

    const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, user.id)).limit(1);
    if (!teacher) return NextResponse.json({ insights: [] });

    const classSubjRows = await db
      .select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId, subjectName: subjects.name, className: classes.name, classSection: classes.section })
      .from(classSubjects)
      .leftJoin(classes, eq(classSubjects.classId, classes.id))
      .leftJoin(subjects, eq(classSubjects.subjectId, subjects.id))
      .where(eq(classSubjects.teacherId, teacher.id));

    const assignedClassIds = Array.from(new Set(classSubjRows.map(r => r.classId).filter(Boolean))) as number[];

    if (assignedClassIds.length === 0) {
      return NextResponse.json({
        insights: [],
        message: "No classes assigned yet. Insights will appear once classes are assigned.",
      });
    }

    // Fetch students
    const studentRows = await db
      .select({ id: students.id, name: users.name, rollNumber: students.rollNumber, classId: students.classId, className: classes.name, classSection: classes.section })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(inArray(students.classId, assignedClassIds));

    const studentIds = studentRows.map(s => s.id);
    if (studentIds.length === 0) return NextResponse.json({ insights: [] });

    // Attendance: last 30 days vs prior 30 days
    const now = new Date();
    const thirtyAgo = new Date(); thirtyAgo.setDate(now.getDate() - 30);
    const sixtyAgo = new Date(); sixtyAgo.setDate(now.getDate() - 60);

    const recentAttRows = await db
      .select({ studentId: attendance.studentId, total: sql<number>`count(*)`, present: sql<number>`SUM(CASE WHEN ${attendance.status}='present' THEN 1 ELSE 0 END)`, halfDay: sql<number>`SUM(CASE WHEN ${attendance.status}='half_day' THEN 1 ELSE 0 END)` })
      .from(attendance)
      .where(and(inArray(attendance.studentId, studentIds), gte(attendance.attendanceDate, thirtyAgo)))
      .groupBy(attendance.studentId);

    const priorAttRows = await db
      .select({ studentId: attendance.studentId, total: sql<number>`count(*)`, present: sql<number>`SUM(CASE WHEN ${attendance.status}='present' THEN 1 ELSE 0 END)`, halfDay: sql<number>`SUM(CASE WHEN ${attendance.status}='half_day' THEN 1 ELSE 0 END)` })
      .from(attendance)
      .where(and(inArray(attendance.studentId, studentIds), gte(attendance.attendanceDate, sixtyAgo), lt(attendance.attendanceDate, thirtyAgo)))
      .groupBy(attendance.studentId);

    const calcPct = (r: { total: number; present: number; halfDay: number }) => {
      const total = Number(r.total || 0);
      const present = Number(r.present || 0) + Number(r.halfDay || 0) * 0.5;
      return total > 0 ? Math.round((present / total) * 100) : null;
    };

    const recentAttMap = new Map(recentAttRows.map(r => [r.studentId, calcPct(r as any)]));
    const priorAttMap = new Map(priorAttRows.map(r => [r.studentId, calcPct(r as any)]));

    // Marks: recent vs prior (computed as true percentages)
    const resultRows = await db
      .select({
        studentId: results.studentId,
        marks: results.marks,
        maxMarks: exams.maxMarks,
        recordedDate: results.recordedDate,
        subjectName: subjects.name,
      })
      .from(results)
      .leftJoin(exams, eq(results.examId, exams.id))
      .leftJoin(subjects, eq(results.subjectId, subjects.id))
      .where(inArray(results.studentId, studentIds))
      .orderBy(desc(results.recordedDate));

    const marksMap = new Map<number, number[]>();
    resultRows.forEach(r => {
      if (!marksMap.has(r.studentId)) marksMap.set(r.studentId, []);
      const maxM = Number(r.maxMarks || 100);
      const pct = maxM > 0 ? (Number(r.marks || 0) / maxM) * 100 : Number(r.marks || 0);
      marksMap.get(r.studentId)!.push(pct);
    });

    // ML predictions
    const predRows = await db
      .select({ studentId: predictions.studentId, riskLevel: predictions.riskLevel, recommendations: predictions.recommendations })
      .from(predictions)
      .where(inArray(predictions.studentId, studentIds))
      .orderBy(desc(predictions.predictionDate));

    const predMap = new Map<number, { riskLevel: string; rec: string }>();
    predRows.forEach(p => { if (!predMap.has(p.studentId)) predMap.set(p.studentId, { riskLevel: p.riskLevel, rec: p.recommendations || "" }); });

    // Pending grading
    const [gradingRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id))
      .where(and(eq(assignments.teacherId, teacher.id), isNull(assignmentSubmissions.grade)));
    const pendingGrading = Number(gradingRow?.count || 0);

    // Build student analytics
    interface StudentAnalytic {
      id: number;
      name: string;
      className: string;
      recentAtt: number | null;
      priorAtt: number | null;
      attDrop: number;
      recentAvg: number | null;
      priorAvg: number | null;
      scoreDrop: number;
      riskLevel: string;
      mlRec: string;
    }

    const analytics: StudentAnalytic[] = studentRows.map(s => {
      const recentAtt = recentAttMap.get(s.id) ?? null;
      const priorAtt = priorAttMap.get(s.id) ?? null;
      const attDrop = (recentAtt !== null && priorAtt !== null) ? priorAtt - recentAtt : 0;

      const scores = marksMap.get(s.id) || [];
      const half = Math.ceil(scores.length / 2);
      const recentScores = scores.slice(0, half);
      const priorScores = scores.slice(half);
      const recentAvg = recentScores.length > 0 ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length) : null;
      const priorAvg = priorScores.length > 0 ? Math.round(priorScores.reduce((a, b) => a + b, 0) / priorScores.length) : null;
      const scoreDrop = (recentAvg !== null && priorAvg !== null) ? priorAvg - recentAvg : 0;

      const pred = predMap.get(s.id);
      let riskLevel = pred?.riskLevel || "low";
      if ((recentAtt !== null && recentAtt < 70) || (recentAvg !== null && recentAvg < 50)) riskLevel = "high";
      else if ((recentAtt !== null && recentAtt < 80) || attDrop > 10 || (recentAvg !== null && recentAvg < 65) || scoreDrop > 10) {
        if (riskLevel === "low") riskLevel = "medium";
      }

      return {
        id: s.id,
        name: s.name || "Student",
        className: `${s.className || "Class"}${s.classSection ? ` ${s.classSection}` : ""}`,
        recentAtt,
        priorAtt,
        attDrop,
        recentAvg,
        priorAvg,
        scoreDrop,
        riskLevel,
        mlRec: pred?.rec || "",
      };
    });

    // ── Build insight categories from real data ──
    const insights: { type: string; severity: string; title: string; evidence: string[]; recommendation: string; affectedStudents?: string[] }[] = [];

    // 1. Attendance decline
    const attDeclineStudents = analytics.filter(a => a.attDrop >= 8 && a.recentAtt !== null && a.recentAtt < 85);
    if (attDeclineStudents.length > 0) {
      insights.push({
        type: "attendance_decline",
        severity: attDeclineStudents.some(s => s.recentAtt! < 70) ? "high" : "medium",
        title: `Attendance Dropping — ${attDeclineStudents.length} Student${attDeclineStudents.length > 1 ? "s" : ""}`,
        evidence: attDeclineStudents.slice(0, 4).map(s =>
          `${s.name} (${s.className}): ${s.recentAtt}% this month vs ${s.priorAtt}% last month (−${s.attDrop}%)`
        ),
        recommendation: attDeclineStudents.length >= 3
          ? `${attDeclineStudents.length} students show a consistent decline in attendance this month. Consider reaching out to guardians and checking if any personal or academic difficulties are contributing.`
          : `${attDeclineStudents[0].name}'s attendance has dropped ${attDeclineStudents[0].attDrop}% this month to ${attDeclineStudents[0].recentAtt}%. A brief follow-up conversation and guardian outreach is recommended.`,
        affectedStudents: attDeclineStudents.map(s => s.name),
      });
    }

    // 2. Performance decline
    const performDeclineStudents = analytics.filter(a => a.scoreDrop >= 8 && a.recentAvg !== null);
    if (performDeclineStudents.length > 0) {
      insights.push({
        type: "performance_decline",
        severity: performDeclineStudents.some(s => s.recentAvg! < 50) ? "high" : "medium",
        title: `Performance Declining — ${performDeclineStudents.length} Student${performDeclineStudents.length > 1 ? "s" : ""}`,
        evidence: performDeclineStudents.slice(0, 4).map(s =>
          `${s.name} (${s.className}): avg ${s.recentAvg}% recently vs ${s.priorAvg}% previously (−${s.scoreDrop} points)`
        ),
        recommendation: `These students show a meaningful score drop compared to their earlier assessments. Identify which topics were tested recently and consider offering a short revision session or targeted practice material.`,
        affectedStudents: performDeclineStudents.map(s => s.name),
      });
    }

    // 3. High risk students (combined)
    const highRiskStudents = analytics.filter(a => a.riskLevel === "high" && !attDeclineStudents.find(s => s.id === a.id) && !performDeclineStudents.find(s => s.id === a.id));
    if (highRiskStudents.length > 0) {
      insights.push({
        type: "at_risk",
        severity: "high",
        title: `${highRiskStudents.length} Student${highRiskStudents.length > 1 ? "s" : ""} Need Immediate Attention`,
        evidence: highRiskStudents.slice(0, 4).map(s => {
          const parts: string[] = [`${s.name} (${s.className})`];
          if (s.recentAtt !== null) parts.push(`Attendance: ${s.recentAtt}%`);
          if (s.recentAvg !== null) parts.push(`Score Avg: ${s.recentAvg}%`);
          if (s.mlRec) parts.push(s.mlRec.slice(0, 60) + (s.mlRec.length > 60 ? "…" : ""));
          return parts.join(" · ");
        }),
        recommendation: highRiskStudents.length === 1
          ? `${highRiskStudents[0].name} shows combined risk signals. A one-on-one check-in and review of their recent submissions would be a good starting point.`
          : `These students show combined attendance and performance risk signals. Prioritize brief individual check-ins this week and consider deploying remedial practice materials via the Resources tab.`,
        affectedStudents: highRiskStudents.map(s => s.name),
      });
    }

    // 4. Pending grading backlog
    if (pendingGrading >= 5) {
      insights.push({
        type: "grading_backlog",
        severity: pendingGrading >= 15 ? "high" : "medium",
        title: `${pendingGrading} Submission${pendingGrading > 1 ? "s" : ""} Awaiting Your Feedback`,
        evidence: [`${pendingGrading} assignment submissions have not yet received a grade or feedback.`, "Timely feedback significantly improves student motivation and learning outcomes."],
        recommendation: `Block 30–45 minutes in the next two days to clear the grading backlog. Use rubric-based grading to speed up the process for routine assignments.`,
      });
    }

    // 5. Improving students (positive insight)
    const improvingStudents = analytics.filter(a => a.scoreDrop < -8 && a.recentAvg !== null && a.recentAvg >= 65);
    if (improvingStudents.length > 0) {
      insights.push({
        type: "improvement",
        severity: "low",
        title: `${improvingStudents.length} Student${improvingStudents.length > 1 ? "s" : ""} Showing Improvement`,
        evidence: improvingStudents.slice(0, 3).map(s =>
          `${s.name} (${s.className}): score improved from ${s.priorAvg}% to ${s.recentAvg}% (+${Math.abs(s.scoreDrop)} points)`
        ),
        recommendation: `These students are on a positive trajectory. Consider acknowledging their progress and providing extension or challenge material to maintain momentum.`,
        affectedStudents: improvingStudents.map(s => s.name),
      });
    }

    // 6. All clear — no issues
    if (insights.length === 0) {
      return NextResponse.json({
        insights: [],
        allClear: true,
        message: `All ${analytics.length} students across ${assignedClassIds.length} class${assignedClassIds.length > 1 ? "es" : ""} appear stable. No critical attendance or performance concerns detected this month.`,
        summary: {
          totalStudents: analytics.length,
          totalClasses: assignedClassIds.length,
          pendingGrading,
        },
      });
    }

    return NextResponse.json({
      insights,
      summary: {
        totalStudents: analytics.length,
        totalClasses: assignedClassIds.length,
        highRiskCount: analytics.filter(a => a.riskLevel === "high").length,
        mediumRiskCount: analytics.filter(a => a.riskLevel === "medium").length,
        pendingGrading,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate insights" }, { status: 500 });
  }
}

// ─── POST — Interactive Q&A (unchanged logic, refined) ───────────────────────
export async function POST(request: Request) {
  try {
    const user = await requireRole("teacher");
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, user.id)).limit(1);
    if (!teacher) return NextResponse.json({ error: "Teacher record not found" }, { status: 403 });

    const classSubjRows = await db
      .select({ classId: classSubjects.classId, subjectId: classSubjects.subjectId, className: classes.name, classSection: classes.section, subjectName: subjects.name })
      .from(classSubjects)
      .leftJoin(classes, eq(classSubjects.classId, classes.id))
      .leftJoin(subjects, eq(classSubjects.subjectId, subjects.id))
      .where(eq(classSubjects.teacherId, teacher.id));

    const assignedClassIds = Array.from(new Set(classSubjRows.map(r => r.classId).filter(Boolean))) as number[];

    if (assignedClassIds.length === 0) {
      return NextResponse.json({ reply: "You currently have no classes assigned. Once classes and subjects are assigned by administration, I can analyze your students' data." });
    }

    const studentRows = await db
      .select({ id: students.id, name: users.name, rollNumber: students.rollNumber, classId: students.classId, className: classes.name, classSection: classes.section })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .leftJoin(classes, eq(students.classId, classes.id))
      .where(inArray(students.classId, assignedClassIds));

    const studentIds = studentRows.map(s => s.id);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const attRows = studentIds.length > 0
      ? await db.select({ studentId: attendance.studentId, total: sql<number>`count(*)`, present: sql<number>`SUM(CASE WHEN ${attendance.status}='present' THEN 1 ELSE 0 END)`, halfDay: sql<number>`SUM(CASE WHEN ${attendance.status}='half_day' THEN 1 ELSE 0 END)` })
          .from(attendance).where(and(inArray(attendance.studentId, studentIds), gte(attendance.attendanceDate, thirtyDaysAgo))).groupBy(attendance.studentId)
      : [];

    const attMap = new Map<number, number>();
    attRows.forEach(r => { const t = Number(r.total || 0); const p = Number(r.present || 0) + Number(r.halfDay || 0) * 0.5; attMap.set(r.studentId, t > 0 ? Math.round((p / t) * 100) : 100); });

    const resultRows = studentIds.length > 0
      ? await db
          .select({
            studentId: results.studentId,
            subjectId: results.subjectId,
            subjectName: subjects.name,
            marks: results.marks,
            maxMarks: exams.maxMarks,
          })
          .from(results)
          .leftJoin(exams, eq(results.examId, exams.id))
          .leftJoin(subjects, eq(results.subjectId, subjects.id))
          .where(inArray(results.studentId, studentIds))
          .orderBy(desc(results.recordedDate))
      : [];

    const marksMap = new Map<number, { scores: number[]; bySubject: Record<string, number[]> }>();
    resultRows.forEach(r => {
      if (!marksMap.has(r.studentId)) marksMap.set(r.studentId, { scores: [], bySubject: {} });
      const data = marksMap.get(r.studentId)!;
      const maxM = Number(r.maxMarks || 100);
      const pct = maxM > 0 ? (Number(r.marks || 0) / maxM) * 100 : Number(r.marks || 0);
      data.scores.push(pct);
      const sn = r.subjectName || "Subject";
      if (!data.bySubject[sn]) data.bySubject[sn] = [];
      data.bySubject[sn].push(pct);
    });

    const predRows = studentIds.length > 0
      ? await db.select({ studentId: predictions.studentId, riskLevel: predictions.riskLevel, recommendations: predictions.recommendations })
          .from(predictions).where(inArray(predictions.studentId, studentIds)).orderBy(desc(predictions.predictionDate))
      : [];

    const predMap = new Map<number, { riskLevel: string; rec: string }>();
    predRows.forEach(p => { if (!predMap.has(p.studentId)) predMap.set(p.studentId, { riskLevel: p.riskLevel, rec: p.recommendations || "" }); });

    const [gradingRow] = await db.select({ count: sql<number>`count(*)` }).from(assignmentSubmissions).innerJoin(assignments, eq(assignmentSubmissions.assignmentId, assignments.id)).where(and(eq(assignments.teacherId, teacher.id), isNull(assignmentSubmissions.grade)));
    const pendingGradingCount = Number(gradingRow?.count || 0);

    const studentSummaries = studentRows.map(s => {
      const att = attMap.get(s.id) ?? 100;
      const md = marksMap.get(s.id);
      const avgScore = md && md.scores.length > 0 ? Math.round(md.scores.reduce((a, b) => a + b, 0) / md.scores.length) : null;
      const subjectAvgs: Record<string, number> = {};
      if (md) Object.entries(md.bySubject).forEach(([sub, scs]) => { subjectAvgs[sub] = Math.round(scs.reduce((a, b) => a + b, 0) / scs.length); });
      const mlPred = predMap.get(s.id);
      let riskLevel: "high" | "medium" | "low" = "low";
      if (mlPred?.riskLevel === "high" || (avgScore !== null && avgScore < 50) || att < 70) riskLevel = "high";
      else if (mlPred?.riskLevel === "medium" || (avgScore !== null && avgScore < 65) || att < 80) riskLevel = "medium";
      return { id: s.id, name: s.name || "Student", className: `${s.className || "Class"}${s.classSection ? ` ${s.classSection}` : ""}`, attendancePct: att, avgScore, subjectAverages: subjectAvgs, riskLevel, recommendation: mlPred?.rec || "" };
    });

    const atRiskStudents = studentSummaries.filter(s => s.riskLevel === "high" || s.riskLevel === "medium");

    const contextSummary = {
      teacherName: user.name,
      totalClasses: assignedClassIds.length,
      totalStudents: studentSummaries.length,
      pendingGradingSubmissions: pendingGradingCount,
      atRiskCount: atRiskStudents.length,
      atRiskSample: atRiskStudents.slice(0, 10).map(s => ({ name: s.name, class: s.className, attendance: `${s.attendancePct}%`, avgScore: s.avgScore !== null ? `${s.avgScore}%` : "No scores yet", subjects: s.subjectAverages, risk: s.riskLevel, mlRecommendation: s.recommendation })),
      allStudentsBrief: studentSummaries.slice(0, 30).map(s => ({ name: s.name, class: s.className, att: s.attendancePct, score: s.avgScore, weakestSubject: Object.entries(s.subjectAverages).sort((a, b) => a[1] - b[1])[0]?.[0] || "None" })),
    };

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const prompt = `You are EduPredict's AI Faculty Co-Pilot — an intelligent, empathetic teaching assistant for ${user.name}.

Use ONLY the following real classroom data to answer the question. Do NOT invent student records, marks, or attendance.
If a student is not in the data, say so rather than fabricating information.

CLASSROOM DATA (real database records):
${JSON.stringify(contextSummary, null, 2)}

TEACHER'S QUESTION: "${query.trim()}"

RESPONSE RULES:
1. Be concise and actionable — bullet points or short paragraphs
2. Reference real student names and their exact recorded metrics when relevant
3. Suggest concrete interventions (revision worksheets, 1-on-1 check-ins, parent outreach, targeted practice)
4. If the question mentions a student not in your data, say "I don't have data for [name] in your assigned classes"
5. Never invent percentages, scores, or trends not in the provided data
6. Maintain a warm, practical, colleague-like tone`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 1000 } }) }
        );

        if (response.ok) {
          const data = await response.json();
          const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (content) return NextResponse.json({ reply: content });
        }
      } catch (aiErr) {
        console.error("Gemini assistant query failed, using deterministic fallback:", aiErr);
      }
    }

    // Deterministic fallback — uses real data, no fabrication
    const lowerQuery = query.toLowerCase();
    let reply = "";

    if (lowerQuery.includes("attention") || lowerQuery.includes("risk") || lowerQuery.includes("struggling") || lowerQuery.includes("today") || lowerQuery.includes("focus")) {
      if (atRiskStudents.length === 0) {
        reply = `**No critical concerns right now.**\n\nAll ${studentSummaries.length} students across your ${assignedClassIds.length} class${assignedClassIds.length > 1 ? "es" : ""} appear stable based on current attendance and assessment records.\n\n**Suggested action:** Use this time proactively — consider preparing extension material for high-performing students or clearing any grading backlog (${pendingGradingCount} submissions pending).`;
      } else {
        const highRisk = atRiskStudents.filter(s => s.riskLevel === "high");
        const medRisk = atRiskStudents.filter(s => s.riskLevel === "medium");
        reply = `**Priority Breakdown — ${atRiskStudents.length} students need attention:**\n\n`;
        if (highRisk.length > 0) {
          reply += `**High Priority (${highRisk.length}):**\n` + highRisk.map(s => `• **${s.name}** (${s.className}): Attendance ${s.attendancePct}%${s.avgScore !== null ? `, Avg Score ${s.avgScore}%` : ""}${s.recommendation ? `. ML Note: ${s.recommendation.slice(0, 80)}` : ""}`).join("\n");
        }
        if (medRisk.length > 0) {
          reply += `\n\n**Moderate Watchlist (${medRisk.length}):**\n` + medRisk.map(s => `• **${s.name}** (${s.className}): Attendance ${s.attendancePct}%${s.avgScore !== null ? `, Avg Score ${s.avgScore}%` : ""}`).join("\n");
        }
        reply += `\n\n**Recommended actions:**\n1. Schedule brief 1-on-1 check-ins with high-priority students\n2. Contact guardians for students with attendance below 75%\n3. Deploy targeted remedial worksheets via the Resources tab`;
      }
    } else if (lowerQuery.includes("grading") || lowerQuery.includes("submiss") || lowerQuery.includes("pending")) {
      reply = pendingGradingCount === 0
        ? "Your grading is fully up to date. No submissions are waiting for feedback."
        : `**${pendingGradingCount} submissions** are currently waiting for your feedback.\n\nTimely grading helps students understand mistakes before moving to the next topic. Aim to clear this within 2-3 working days.`;
    } else {
      // Named student lookup
      const matchedStudent = studentSummaries.find(s => lowerQuery.includes(s.name.toLowerCase()));
      if (matchedStudent) {
        const weakSubjects = Object.entries(matchedStudent.subjectAverages).filter(([, v]) => v < 60).sort((a, b) => a[1] - b[1]).map(([k]) => k);
        const strongSubjects = Object.entries(matchedStudent.subjectAverages).filter(([, v]) => v >= 70).sort((a, b) => b[1] - a[1]).map(([k]) => k);
        reply = `**Profile: ${matchedStudent.name} (${matchedStudent.className})**\n\n`;
        reply += `• **Attendance (last 30 days):** ${matchedStudent.attendancePct}%\n`;
        reply += `• **Overall Average:** ${matchedStudent.avgScore !== null ? matchedStudent.avgScore + "%" : "No recorded marks yet"}\n`;
        if (Object.keys(matchedStudent.subjectAverages).length > 0) {
          reply += `• **Subject Breakdown:**\n${Object.entries(matchedStudent.subjectAverages).map(([sub, sc]) => `  - ${sub}: ${sc}%`).join("\n")}\n`;
        }
        if (weakSubjects.length > 0) reply += `• **Needs support in:** ${weakSubjects.join(", ")}\n`;
        if (strongSubjects.length > 0) reply += `• **Performing well in:** ${strongSubjects.join(", ")}\n`;
        reply += `\n**Suggested next steps:**\n`;
        if (matchedStudent.attendancePct < 75) reply += `1. Follow up on attendance with guardian — ${matchedStudent.attendancePct}% is below the 75% threshold.\n`;
        if (weakSubjects.length > 0) reply += `${matchedStudent.attendancePct < 75 ? "2" : "1"}. Deploy remedial practice in ${weakSubjects[0]} from the Resources → AI Material Builder.\n`;
        reply += `${weakSubjects.length > 0 || matchedStudent.attendancePct < 75 ? "3" : "1"}. Review their recent assignment submissions for patterns in errors.`;
      } else {
        reply = `I've analyzed your ${studentSummaries.length} students across ${assignedClassIds.length} class${assignedClassIds.length > 1 ? "es" : ""}.\n\n**Quick Summary:**\n• Students needing attention: **${atRiskStudents.length}**\n• Pending grading: **${pendingGradingCount} submissions**\n\nYou can ask me about:\n- Specific students by name (e.g. "How is [student name] doing?")\n- "Which students need attention today?"\n- "Show me grading backlog"\n- "Students struggling in [subject]"`;
      }
    }

    return NextResponse.json({ reply });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process AI assistant request" }, { status: 500 });
  }
}
