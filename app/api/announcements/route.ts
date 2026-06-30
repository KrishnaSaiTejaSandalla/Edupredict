import { NextResponse } from "next/server";
import { getAnnouncements } from "@/lib/announcement-actions";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const list = await getAnnouncements();
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error fetching announcements:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
