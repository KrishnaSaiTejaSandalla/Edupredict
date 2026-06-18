import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers, schools, users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  getTeacherResources,
  createResource,
  deleteResource,
  incrementDownload,
  getResourceSubjects,
} from "@/lib/teacher-resources.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id })
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
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);
    if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

    const [dbUser] = await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, user.id)).limit(1);
    const schoolId = dbUser?.schoolId || 1;

    const body = await request.json();
    const { title, description, subject, classLevel, resourceType, fileUrl, isAIGenerated, aiPrompt, aiContent } = body;

    if (!title || !resourceType) {
      return NextResponse.json({ error: "Title and resource type are required" }, { status: 400 });
    }

    await createResource(teacher.id, schoolId, {
      title, description, subject, classLevel, resourceType, fileUrl, isAIGenerated, aiPrompt, aiContent,
    });
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
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
