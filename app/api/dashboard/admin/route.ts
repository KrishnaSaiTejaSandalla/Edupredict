import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/admin-dashboard.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req, "admin");
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const data = await getAdminDashboardData(user.id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
