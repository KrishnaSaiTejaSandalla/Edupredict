import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/message-actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const otherUserId = Number(searchParams.get("otherUserId"));
    const limit = Number(searchParams.get("limit") || "50");
    const offset = Number(searchParams.get("offset") || "0");

    if (!otherUserId) {
      return NextResponse.json({ error: "Missing otherUserId parameter" }, { status: 400 });
    }

    const messages = await getMessages(otherUserId, limit, offset);
    return NextResponse.json(messages);
  } catch (error: any) {
    const errorMsg = error.message || "Failed to retrieve messages";
    const isForbidden = errorMsg.toLowerCase().includes("forbidden") || errorMsg.toLowerCase().includes("not authorized");
    return NextResponse.json(
      { error: errorMsg },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
