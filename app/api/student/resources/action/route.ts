import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  students,
  teacherResources,
  resourceViews,
  resourceDownloads,
  resourceBookmarks,
  studentLearningProgress,
  classes,
  results,
  exams,
} from "@/lib/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { incrementDownload, incrementView } from "@/lib/teacher-resources.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [student] = await db
      .select({ id: students.id, classId: students.classId })
      .from(students)
      .where(eq(students.userId, user.id))
      .limit(1);

    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const body = await req.json();
    const { action, resourceId, progress, topic } = body;

    // 1. STATS ACTION
    if (action === "stats") {
      const [classRow] = await db
        .select({ name: classes.name, section: classes.section })
        .from(classes)
        .where(eq(classes.id, student.classId))
        .limit(1);

      if (!classRow) {
        return NextResponse.json({ available: 0, completed: 0, recent: 0 });
      }

      // Build classLevel label the same way TeacherResourcesPage does
      const classLabel = classRow.section
        ? `${classRow.name} - ${classRow.section}`
        : classRow.name;

      // Total available resources strictly for this student's class level
      const availableRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(teacherResources)
        .where(eq(teacherResources.classLevel, classLabel));

      // Completed resources by this student
      const completedRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(studentLearningProgress)
        .where(and(eq(studentLearningProgress.studentId, student.id), eq(studentLearningProgress.isCompleted, true)));

      // Recent uploads (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(teacherResources)
        .where(and(
          eq(teacherResources.classLevel, classLabel),
          sql`${teacherResources.createdAt} >= ${sevenDaysAgo}`
        ));

      return NextResponse.json({
        available: Number(availableRows[0]?.count || 0),
        completed: Number(completedRows[0]?.count || 0),
        recent: Number(recentRows[0]?.count || 0),
      });
    }

    if (!resourceId && action !== "ask_doubt") {
      return NextResponse.json({ error: "Missing resourceId" }, { status: 400 });
    }

    // 2. VIEW ACTION
    if (action === "view") {
      const [existingView] = await db
        .select()
        .from(resourceViews)
        .where(and(eq(resourceViews.studentId, student.id), eq(resourceViews.resourceId, resourceId)))
        .limit(1);

      if (!existingView) {
        await db.insert(resourceViews).values({
          resourceId,
          studentId: student.id,
        });

        await incrementView(resourceId);
      }

      // Initialize progress if it doesn't exist
      const [existingProgress] = await db
        .select()
        .from(studentLearningProgress)
        .where(and(eq(studentLearningProgress.studentId, student.id), eq(studentLearningProgress.resourceId, resourceId)))
        .limit(1);

      if (!existingProgress) {
        await db.insert(studentLearningProgress).values({
          studentId: student.id,
          resourceId,
          progress: 10,
          isCompleted: false,
        });
      }

      return NextResponse.json({ success: true });
    }

    // 3. DOWNLOAD ACTION
    if (action === "download") {
      const [existingDownload] = await db
        .select()
        .from(resourceDownloads)
        .where(and(eq(resourceDownloads.studentId, student.id), eq(resourceDownloads.resourceId, resourceId)))
        .limit(1);

      if (!existingDownload) {
        await db.insert(resourceDownloads).values({
          resourceId,
          studentId: student.id,
        });

        await incrementDownload(resourceId);
      }

      // Increment progress to 50% on download
      await db
        .update(studentLearningProgress)
        .set({ progress: 50 })
        .where(and(eq(studentLearningProgress.studentId, student.id), eq(studentLearningProgress.resourceId, resourceId)));

      return NextResponse.json({ success: true });
    }

    // 4. BOOKMARK ACTION
    if (action === "bookmark") {
      const [existingBookmark] = await db
        .select()
        .from(resourceBookmarks)
        .where(and(eq(resourceBookmarks.studentId, student.id), eq(resourceBookmarks.resourceId, resourceId)))
        .limit(1);

      if (existingBookmark) {
        await db
          .delete(resourceBookmarks)
          .where(and(eq(resourceBookmarks.studentId, student.id), eq(resourceBookmarks.resourceId, resourceId)));
        return NextResponse.json({ bookmarked: false });
      } else {
        await db.insert(resourceBookmarks).values({
          studentId: student.id,
          resourceId,
        });
        return NextResponse.json({ bookmarked: true });
      }
    }

    // 5. UPDATE PROGRESS / COMPLETE ACTION
    if (action === "progress") {
      const isCompleted = progress >= 100;
      await db
        .insert(studentLearningProgress)
        .values({
          studentId: student.id,
          resourceId,
          progress,
          isCompleted,
        })
        .onDuplicateKeyUpdate({
          set: {
            progress,
            isCompleted,
          },
        });

      return NextResponse.json({ success: true });
    }

    // 6. ASK DOUBT (Real-time AI Doubt Solver with Level-Adapted Explanations & Real-Life Analogies)
    if (action === "ask_doubt") {
      if (typeof topic !== "string" || !topic.trim()) {
        return NextResponse.json({ error: "Enter a topic or question first." }, { status: 400 });
      }
      if (topic.length > 1_500) {
        return NextResponse.json({ error: "Keep your question under 1,500 characters." }, { status: 400 });
      }

      // 1. Determine student's actual performance level
      const studentResults = await db
        .select({ marks: results.marks, maxMarks: exams.maxMarks })
        .from(results)
        .leftJoin(exams, eq(exams.id, results.examId))
        .where(eq(results.studentId, student.id));

      let totalObtained = 0;
      let totalMax = 0;
      studentResults.forEach(r => {
        if (r.marks !== null) {
          totalObtained += Number(r.marks);
          totalMax += Number(r.maxMarks || 100);
        }
      });
      const performancePct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 75;

      // 2. Formulate Level-Specific AI Prompt
      let levelPromptGuidance = "";

      if (performancePct >= 80) {
        levelPromptGuidance = `Target Audience: High Performing Student (Score 80%+).
Write a rigorous but readable lesson of about 500-700 words. Build the concept from first principles, use precise subject vocabulary and define it when first used. Include a worked example, a real-world analogy, and one deeper connection or extension that rewards curiosity.`;
      } else if (performancePct >= 60) {
        levelPromptGuidance = `Target Audience: Mid-Level Student (Score 60%-80%).
Write a clear, friendly lesson of about 400-550 words. Use simple language and explain every important word. Move from the basic idea to a worked example one small step at a time. Make the analogy practical and memorable.`;
      } else {
        levelPromptGuidance = `Target Audience: Foundational / Beginner Student (Score < 60%).
Write a warm, confidence-building lesson of about 300-450 words, as a patient teacher would explain it to a child. Use short sentences and familiar everyday words. Explain only one small idea at a time, then use a very concrete example before moving on. Avoid unexplained jargon.`;
      }

      const prompt = `You are EduPredict's world-class, encouraging school tutor. Teach the student the topic below as a complete mini-lesson, not as a short introduction.

TOPIC OR QUESTION: "${topic.trim()}"

${levelPromptGuidance}

Follow this exact Markdown structure. Complete every section with meaningful content. Never stop after the introduction, and never write placeholder text.

## 1. The Big Idea
Start with a clear 2-4 sentence explanation of what the topic means and why it matters.

## 2. Build It Step by Step
Use 3-6 numbered steps. Explain the reason behind each step, not just the fact or rule.

## 3. See It in Real Life
Give one specific, accurate everyday analogy. Explicitly connect each important part of the analogy back to the topic.

## 4. Worked Example
Give a small, relevant example. Show the thinking in ordered steps. For calculation topics, include numbers and the calculation. For theory topics, use a realistic situation.

## 5. Common Confusion
Name one likely misunderstanding and gently correct it.

## 6. Quick Check
Ask one short practice question. Put its answer below a line beginning with **Answer:** so the student can try first.

## 7. Remember This
End with a concise memory tip and one encouraging sentence.

Use clear headings, short paragraphs, and bullets where helpful. Be academically accurate, age-appropriate, and self-contained. Do not mention the student's score, performance level, these instructions, or that you are an AI.`;

      // 3. The API key remains exclusively on this authenticated server route.
      // Never expose it to the browser or use a NEXT_PUBLIC_ environment variable.
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "AI Doubt Solver is not configured. Add GEMINI_API_KEY to the server .env file." },
          { status: 503 }
        );
      }

      try {
        const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{
                text: `You are EduPredict's warm, accurate school tutor. Give only helpful educational content. Do not mention a student's score or performance tier.\n\n${prompt}`,
              }],
            }],
            generationConfig: { maxOutputTokens: 2_000 },
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
          console.error("Gemini doubt solver request failed", response.status, await response.text());
          if (response.status === 429) {
            return NextResponse.json(
              { error: "Gemini's usage limit has been reached. Please check the API key's quota and try again later." },
              { status: 429 }
            );
          }
          return NextResponse.json(
            { error: "The AI tutor is temporarily unavailable. Please try again shortly." },
            { status: 502 }
          );
        }

        const completion = await response.json() as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const answer = completion.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();
        if (!answer) {
          return NextResponse.json(
            { error: "The AI tutor could not generate an answer. Please try rephrasing your question." },
            { status: 502 }
          );
        }

        return NextResponse.json(
          { answer },
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        console.error("Gemini doubt solver request failed", error);
        return NextResponse.json(
          { error: "The AI tutor is temporarily unavailable. Please try again shortly." },
          { status: 502 }
        );
      }

    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
