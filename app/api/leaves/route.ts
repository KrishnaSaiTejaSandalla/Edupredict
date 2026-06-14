import { NextResponse } from "next/server";
import { getAllLeaveRequests } from "@/lib/leave-actions";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const list = await getAllLeaveRequests();
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
