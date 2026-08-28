import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  teachers, classes, students, users, attendance, predictions, classTeacherAssignments,
} from "@/lib/schema";
import { eq, and, inArray, gte, sql, desc, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireRole("teacher");
    const body = await request.json().catch(() => null);
    const classId = body?.classId;

    if (!Number.isInteger(Number(classId)) || Number(classId) < 1) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    const cId = Number(classId);

    // Verify teacher assignment to this class
    const [teacher] = await db.select().from(teachers).where(eq(teachers.userId, user.id)).limit(1);
    if (!teacher) return NextResponse.json({ error: "Teacher record not found" }, { status: 403 });

    const [assignment] = await db
      .select({ id: classTeacherAssignments.id })
      .from(classTeacherAssignments)
      .where(and(eq(classTeacherAssignments.teacherId, teacher.id), eq(classTeacherAssignments.classId, cId)))
      .limit(1);
    if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Fetch students in this class
    const studentRows = await db
      .select({
        id: students.id,
        name: users.name,
        rollNumber: students.rollNumber,
      })
      .from(students)
      .leftJoin(users, eq(students.userId, users.id))
      .where(eq(students.classId, cId));

    if (studentRows.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const studentIds = studentRows.map((s) => s.id);

    // Fetch last 60 days of attendance
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Attendance stats: last 30 days vs prior 30 days
    const recentAttRows = await db
      .select({
        studentId: attendance.studentId,
        total: sql<number>`count(*)`,
        present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)`,
        halfDay: sql<number>`SUM(CASE WHEN ${attendance.status} = 'half_day' THEN 1 ELSE 0 END)`,
        absent: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)`,
      })
      .from(attendance)
      .where(and(inArray(attendance.studentId, studentIds), gte(attendance.attendanceDate, thirtyDaysAgo)))
      .groupBy(attendance.studentId);

    const priorAttRows = await db
      .select({
        studentId: attendance.studentId,
        total: sql<number>`count(*)`,
        present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)`,
        halfDay: sql<number>`SUM(CASE WHEN ${attendance.status} = 'half_day' THEN 1 ELSE 0 END)`,
      })
      .from(attendance)
      .where(
        and(
          inArray(attendance.studentId, studentIds),
          gte(attendance.attendanceDate, sixtyDaysAgo),
          lte(attendance.attendanceDate, thirtyDaysAgo)
        )
      )
      .groupBy(attendance.studentId);

    // Fetch existing ML predictions
    const predRows = await db
      .select({
        studentId: predictions.studentId,
        riskLevel: predictions.riskLevel,
        recommendations: predictions.recommendations,
      })
      .from(predictions)
      .where(inArray(predictions.studentId, studentIds))
      .orderBy(desc(predictions.predictionDate));

    const predMap = new Map<number, { riskLevel: string; rec: string }>();
    predRows.forEach((p) => {
      if (!predMap.has(p.studentId)) predMap.set(p.studentId, { riskLevel: p.riskLevel, rec: p.recommendations || "" });
    });

    const recentMap = new Map(recentAttRows.map((r) => [r.studentId, r]));
    const priorMap = new Map(priorAttRows.map((r) => [r.studentId, r]));

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Analyze each student
    const studentRiskList = await Promise.all(
      studentRows.map(async (s) => {
        const rec = recentMap.get(s.id);
        const pri = priorMap.get(s.id);

        const recTotal = Number(rec?.total || 0);
        const recPresent = Number(rec?.present || 0) + Number(rec?.halfDay || 0) * 0.5;
        const recAbsent = Number(rec?.absent || 0);
        const recPct = recTotal > 0 ? Math.round((recPresent / recTotal) * 100) : 100;

        const priTotal = Number(pri?.total || 0);
        const priPresent = Number(pri?.present || 0) + Number(pri?.halfDay || 0) * 0.5;
        const priPct = priTotal > 0 ? Math.round((priPresent / priTotal) * 100) : 100;

        const drop = priTotal > 0 ? priPct - recPct : 0;
        const mlPred = predMap.get(s.id);

        // Deterministic risk score calculation
        let riskLevel: "high" | "medium" | "low" = "low";
        let primaryFactor = "";

        if (recPct < 70 || recAbsent >= 5 || drop >= 15) {
          riskLevel = "high";
          primaryFactor = recPct < 70
            ? `Critical attendance rate (${recPct}%)`
            : drop >= 15
            ? `Severe attendance drop (${priPct}% → ${recPct}%)`
            : `${recAbsent} absences recorded in last 30 days`;
        } else if (recPct < 82 || drop >= 8 || mlPred?.riskLevel === "medium") {
          riskLevel = "medium";
          primaryFactor = recPct < 82
            ? `Below target attendance (${recPct}%)`
            : drop >= 8
            ? `Noticeable attendance drop (${priPct}% → ${recPct}%)`
            : `ML model flagged moderate attendance risk`;
        } else {
          primaryFactor = `Stable attendance (${recPct}%)`;
        }

        // Generate natural language explanation
        let riskExplanation = "";
        let suggestedAction = "";

        if (riskLevel === "low") {
          riskExplanation = `Attendance is stable at ${recPct}% with regular participation over the last 30 days.`;
          suggestedAction = `No action needed. Continue standard attendance tracking.`;
        } else {
          if (apiKey) {
            try {
              const prompt = `Explain attendance risk for student ${s.name} based ONLY on these real numbers:
- Recent 30-day attendance: ${recPct}% (${recPresent}/${recTotal} days present, ${recAbsent} absences)
- Previous period attendance: ${priPct}%
- Change: ${drop > 0 ? `down by ${drop}%` : drop < 0 ? `up by ${Math.abs(drop)}%` : "no change"}
- Risk Level: ${riskLevel}

Return JSON with 2 keys:
{
  "why": "2 short sentences explaining why using exact numbers provided",
  "suggestedAction": "1 clear action for the teacher"
}`;

              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
                  }),
                }
              );

              if (res.ok) {
                const data = await res.json();
                const json = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
                if (json.why) riskExplanation = json.why;
                if (json.suggestedAction) suggestedAction = json.suggestedAction;
              }
            } catch (e) {
              // fallback below
            }
          }

          if (!riskExplanation) {
            riskExplanation = drop > 0
              ? `Attendance dropped from ${priPct}% to ${recPct}% over the last 30 days, with ${recAbsent} absence${recAbsent > 1 ? "s" : ""} recorded.`
              : `Current attendance is at ${recPct}%, which is below the 80% threshold required for academic consistency.`;
            suggestedAction = recPct < 75
              ? `Contact guardian and schedule a brief attendance check-in.`
              : `Monitor attendance closely for the next two weeks.`;
          }
        }

        return {
          id: s.id,
          name: s.name || "Student",
          rollNumber: s.rollNumber,
          attendancePct: recPct,
          previousPct: priPct,
          absentDays: recAbsent,
          totalDays: recTotal,
          riskLevel,
          primaryFactor,
          riskExplanation,
          suggestedAction,
        };
      })
    );

    return NextResponse.json({ students: studentRiskList });
  } catch (error) {
    console.error("Attendance risk analysis failed:", error);
    return NextResponse.json({ error: "Attendance risk analysis could not be completed" }, { status: 500 });
  }
}
