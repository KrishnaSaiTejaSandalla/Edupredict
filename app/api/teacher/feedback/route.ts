import { NextResponse } from "next/server";
import { getFeedbackByUser } from "@/lib/feedback-actions";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole("teacher");
    const list = await getFeedbackByUser(user.id);
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error fetching teacher feedback:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
