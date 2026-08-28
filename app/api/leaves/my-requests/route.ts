import { NextResponse } from "next/server";
import { getLeaveRequestsByUser } from "@/lib/leave-actions";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { leaveRequests } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentIdStr = searchParams.get("studentId");

    if (studentIdStr) {
      const studentId = Number(studentIdStr);
      const list = await db
        .select()
        .from(leaveRequests)
        .where(eq(leaveRequests.studentId, studentId))
        .orderBy(desc(leaveRequests.createdAt));
      return NextResponse.json(list);
    }

    const list = await getLeaveRequestsByUser(user.id);
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error fetching user leave requests:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
