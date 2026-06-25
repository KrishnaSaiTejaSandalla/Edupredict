import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getStudentsForExam, enterMarks, updateMark, getTeacherResults, getMarksAnalytics } from "@/lib/teacher-marks.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireRole("teacher");
    const [teacher] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    if (!teacher) return NextResponse.json({ students: [], results: [], total: 0, pages: 0 });

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "students") {
      const examId = Number(searchParams.get("examId"));
      if (!examId) return NextResponse.json({ students: [] });
      const students = await getStudentsForExam(examId);
      return NextResponse.json({ students });
    }

    if (action === "results") {
      const page = Number(searchParams.get("page") || 1);
      const pageSize = Number(searchParams.get("pageSize") || 15);
      const search = searchParams.get("search") || undefined;
      const classId = searchParams.get("classId") ? Number(searchParams.get("classId")) : undefined;
      const subjectId = searchParams.get("subjectId") ? Number(searchParams.get("subjectId")) : undefined;
      const examType = searchParams.get("examType") || undefined;

      const data = await getTeacherResults(teacher.id, { page, pageSize, search, classId, subjectId, examType });
      return NextResponse.json(data);
    }

    if (action === "analytics") {
      const data = await getMarksAnalytics(teacher.id);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRole("teacher");
    const body = await request.json();
    const { examId, subjectId, marksData } = body;

    if (!examId || !subjectId || !Array.isArray(marksData)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await enterMarks(examId, subjectId, marksData);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole("teacher");
    const body = await request.json();
    const { resultId, marks, remarks } = body;

    if (!resultId || marks === undefined) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await updateMark(resultId, marks, remarks);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
