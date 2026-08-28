import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTeacherDashboardData } from "@/lib/teacher-dashboard.service";
import { db } from "@/lib/db";
import { teachers } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req, "teacher");
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, user.id))
      .limit(1);

    const dashboard = await getTeacherDashboardData(user.id);
    
    return NextResponse.json({
      userName: user.name,
      teacherDept: teacher?.department || null,
      dashboard,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
