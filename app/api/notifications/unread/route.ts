import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        priority: notifications.priority,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          eq(notifications.isRead, false)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(5);

    const alerts = rows.map((n) => ({
      id: n.id.toString(),
      title: n.title ?? "Notification",
      message: n.message ?? "",
      tone: (n.priority === "high"
        ? "danger"
        : n.priority === "medium"
        ? "warning"
        : "info") as "danger" | "warning" | "info",
      time: n.createdAt
        ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "",
    }));

    return NextResponse.json(alerts);
  } catch (error: any) {
    console.error("Error fetching unread notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
