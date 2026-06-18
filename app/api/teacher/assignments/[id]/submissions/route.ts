import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSubmissions, gradeSubmission, getAssignmentAnalytics } from "@/lib/teacher-assignments.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("teacher");
    const { id } = await params;
    const assignmentId = Number(id);
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 15);
    const action = searchParams.get("action");

    if (action === "analytics") {
      const analytics = await getAssignmentAnalytics(assignmentId);
      return NextResponse.json(analytics);
    }

    const data = await getSubmissions(assignmentId, page, pageSize);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole("teacher");
    const body = await request.json();
    const { submissionId, grade, feedback } = body;

    if (!submissionId || grade === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await gradeSubmission(submissionId, grade, feedback || "", user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
