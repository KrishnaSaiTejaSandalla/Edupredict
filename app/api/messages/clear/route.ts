import { NextRequest, NextResponse } from "next/server";
import { clearConversation } from "@/lib/message-actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otherUserId } = await req.json();
    if (!otherUserId) {
      return NextResponse.json({ error: "Missing otherUserId parameter" }, { status: 400 });
    }

    await clearConversation(Number(otherUserId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    const errorMsg = error.message || "Failed to clear conversation";
    const isForbidden = errorMsg.toLowerCase().includes("forbidden");
    return NextResponse.json(
      { error: errorMsg },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
