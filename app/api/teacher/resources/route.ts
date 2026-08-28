import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, teacherResources, classes, students } from "@/lib/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  getTeacherResources,
  createResource,
  deleteResource,
  incrementDownload,
  getResourceSubjects,
} from "@/lib/teacher-resources.service";
import { createNotificationForUser } from "@/lib/notification-actions";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id, schoolId: teachers.schoolId })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);
    if (!teacher) return NextResponse.json({ items: [], total: 0, pages: 0 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "subjects") {
      const subjects = await getResourceSubjects(teacher.id);
      return NextResponse.json({ subjects });
    }

    if (action === "stats") {
      const totalResourcesRows = await db
        .select({ count: sql<number>`count(*)` })
        .from(teacherResources)
        .where(eq(teacherResources.teacherId, teacher.id));
      
      const viewsAndDownloads = await db
        .select({
          totalViews: sql<number>`sum(${teacherResources.viewCount})`,
          totalDownloads: sql<number>`sum(${teacherResources.downloadCount})`,
        })
        .from(teacherResources)
        .where(eq(teacherResources.teacherId, teacher.id));

      const [mostViewed] = await db
        .select({ title: teacherResources.title })
        .from(teacherResources)
        .where(eq(teacherResources.teacherId, teacher.id))
        .orderBy(desc(teacherResources.viewCount))
        .limit(1);

      return NextResponse.json({
        totalUploaded: Number(totalResourcesRows[0]?.count || 0),
        totalViews: Number(viewsAndDownloads[0]?.totalViews || 0),
        totalDownloads: Number(viewsAndDownloads[0]?.totalDownloads || 0),
        mostViewed: mostViewed?.title || "None",
      });
    }

    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 12);
    const search = searchParams.get("search") || undefined;
    const subject = searchParams.get("subject") || undefined;
    const resourceType = searchParams.get("resourceType") || undefined;

    const data = await getTeacherResources(teacher.id, { page, pageSize, search, subject, resourceType });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id, schoolId: teachers.schoolId })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const body = await request.json();
    const { title, description, subject, classLevel, resourceType, fileUrl, isAIGenerated, aiPrompt, aiContent } = body;

    if (!title || !resourceType) {
      return NextResponse.json({ error: "Title and resource type are required" }, { status: 400 });
    }

    const schoolId = teacher.schoolId;

    await createResource(teacher.id, schoolId, {
      title, description, subject, classLevel, resourceType, fileUrl, isAIGenerated, aiPrompt, aiContent,
    });

    // Realtime notification trigger
    if (classLevel) {
      // classLevel is now "Name - Section" format (e.g. "10 - A")
      const parts = classLevel.split(" - ");
      const className = parts[0]?.trim();
      const classSection = parts[1]?.trim() || null;

      const classQuery = db
        .select({ id: classes.id })
        .from(classes)
        .where(
          classSection
            ? and(eq(classes.name, className), eq(classes.section, classSection))
            : eq(classes.name, className)
        )
        .limit(1);

      const [classRow] = await classQuery;

      if (classRow) {
        const classStudents = await db
          .select({ userId: students.userId })
          .from(students)
          .where(eq(students.classId, classRow.id));

        for (const student of classStudents) {
          await createNotificationForUser(
            student.userId,
            "New Resource Added",
            `Your ${subject || 'teacher'} uploaded ${title} for ${classLevel}.`,
            "assignments",
            "low"
          );
        }
      }
    }

    revalidatePath("/teacher/resources");
    revalidatePath("/student/resources");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Verify the resource belongs to this teacher
    const [existing] = await db
      .select()
      .from(teacherResources)
      .where(and(eq(teacherResources.id, id), eq(teacherResources.teacherId, teacher.id)))
      .limit(1);
    if (!existing) return NextResponse.json({ error: "Resource not found" }, { status: 404 });

    const body = await request.json();
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description || null;
    if (body.subject !== undefined) updates.subject = body.subject || null;
    if (body.classLevel !== undefined) updates.classLevel = body.classLevel || null;

    await db
      .update(teacherResources)
      .set(updates)
      .where(eq(teacherResources.id, id));

    revalidatePath("/teacher/resources");
    revalidatePath("/student/resources");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await deleteResource(id, teacher.id);
    revalidatePath("/teacher/resources");
    revalidatePath("/student/resources");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
