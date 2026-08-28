import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/student-dashboard.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req, "student");
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const data = await getStudentDashboardData(user.id);
    return NextResponse.json({
      userName: user.name,
      dashboard: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
