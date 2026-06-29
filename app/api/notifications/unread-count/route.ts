import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [row] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.isRead, false)
        )
      );

    const count = Number(row?.count || 0);
    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json({ count: 0, error: error.message }, { status: 500 });
  }
}