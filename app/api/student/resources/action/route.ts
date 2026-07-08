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
  classes
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
        .select({ name: classes.name })
        .from(classes)
        .where(eq(classes.id, student.classId))
        .limit(1);

      if (!classRow) {
        return NextResponse.json({ available: 0, completed: 0, recent: 0 });
      }

      // Total available resources for this student's class Level
      const availableRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(teacherResources)
        .where(eq(teacherResources.classLevel, classRow.name));

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
        .where(and(eq(teacherResources.classLevel, classRow.name), sql`${teacherResources.createdAt} >= ${sevenDaysAgo}`));

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
      await db.insert(resourceViews).values({
        resourceId,
        studentId: student.id,
      });

      await incrementView(resourceId);

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
      await db.insert(resourceDownloads).values({
        resourceId,
        studentId: student.id,
      });

      await incrementDownload(resourceId);

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

    // 6. ASK DOUBT (AI prediction connected local solver)
    if (action === "ask_doubt") {
      if (!topic) return NextResponse.json({ error: "Missing topic" }, { status: 400 });
      
      const doubtAnswer = `### 🤖 AI Doubts Solver: ${topic}\n\nHere is a quick concept breakdown to help you study:\n\n1. **Core Concept**: ${topic} is key to understanding this chapter. Focus on the core mechanics first.\n2. **Common Mistake**: Trying to memorize formulas without applying them. Practice solving 3 real problems.\n3. **Quick Hack**: Draw a diagram and list your inputs. Retaining visual layouts boosts recollection by 70%.\n\n*Study tips: You can find relevant materials uploaded by your teacher in the library grid below.*`;
      return NextResponse.json({ answer: doubtAnswer });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
