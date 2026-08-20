import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getUserNotificationPreferences } from "@/lib/notification-actions";
import { isNotificationAllowedByPrefs } from "@/lib/notification-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [unreadRows, prefs] = await Promise.all([
      db
        .select({
          id: notifications.id,
          type: notifications.type,
          title: notifications.title,
          message: notifications.message,
        })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false))),
      getUserNotificationPreferences(user.id),
    ]);

    const allowedUnreadCount = unreadRows.filter((r) =>
      isNotificationAllowedByPrefs(
        { type: r.type, title: r.title, message: r.message },
        prefs
      )
    ).length;

    return NextResponse.json({ count: allowedUnreadCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}