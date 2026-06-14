import { NextResponse } from "next/server";
import { getAllBuses } from "@/lib/transport-actions";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole("admin");
    const list = await getAllBuses();
    return NextResponse.json(list);
  } catch (error: any) {
    console.error("Error fetching buses:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
