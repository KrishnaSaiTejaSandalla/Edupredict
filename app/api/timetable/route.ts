import { NextResponse } from "next/server";
import { getAllTimetableEntries } from "@/lib/timetable-actions";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Restrict access to authenticated users (admin, teacher, parent, student)
    await requireAuth();
    const list = await getAllTimetableEntries();
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error fetching timetable entries:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
