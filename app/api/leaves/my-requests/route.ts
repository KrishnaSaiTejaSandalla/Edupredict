import { NextResponse } from "next/server";
import { getLeaveRequestsByUser } from "@/lib/leave-actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const list = await getLeaveRequestsByUser(user.id);
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error fetching user leave requests:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
