import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { eq, and, count } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ count: 0 });
    }

    const [result] = await db
        .select({
            count: count(),
        })
        .from(notifications)
        .where(
            and(
                eq(notifications.userId, user.id),
                eq(notifications.isRead, false)
            )
        );

    return NextResponse.json({
        count: Number(result.count || 0),
    });
}