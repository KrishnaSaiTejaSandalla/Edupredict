import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getUserNotificationPreferences } from "@/lib/notification-actions";
import { isNotificationAllowedByPrefs } from "@/lib/notification-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows, prefs] = await Promise.all([
      db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50),
      getUserNotificationPreferences(user.id),
    ]);

    const allowedRows = rows.filter((r) =>
      isNotificationAllowedByPrefs(
        { type: r.type, title: r.title, message: r.message },
        prefs
      )
    ).slice(0, 30);

    const items = allowedRows.map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title ?? "Notification",
      message: r.message ?? "",
      type: r.type ?? "general",
      priority: r.priority ?? "medium",
      isRead: r.isRead,
      actionUrl: r.actionUrl || null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      readAt: r.readAt ? r.readAt.toISOString() : null,
    }));

    return NextResponse.json({
      items,
      preferences: prefs,
    });
  } catch (error: any) {
    console.error("Error fetching latest notifications:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
