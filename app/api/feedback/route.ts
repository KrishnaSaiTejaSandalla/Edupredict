import { NextResponse } from "next/server";
import { getAllFeedback } from "@/lib/feedback-actions";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const list = await getAllFeedback();
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
