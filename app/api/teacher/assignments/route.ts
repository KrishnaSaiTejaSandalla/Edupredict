import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  getTeacherAssignments,
  createAssignment,
  deleteAssignment,
} from "@/lib/teacher-assignments.service";

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
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 12);
    const search = searchParams.get("search") || undefined;

    const data = await getTeacherAssignments(teacher.id, { page, pageSize, search });
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

    const body = await request.json();
    const { classId, subjectId, title, description, dueDate, maxMarks } = body;

    if (!classId || !subjectId || !title || !dueDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await createAssignment(teacher.id, { classId, subjectId, title, description, dueDate, maxMarks });
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

    await deleteAssignment(id, teacher.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
