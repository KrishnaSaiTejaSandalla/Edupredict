import { NextRequest, NextResponse } from "next/server";
import { clearConversation } from "@/lib/message-actions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { otherUserId } = await req.json();
    if (!otherUserId) {
      return NextResponse.json({ error: "Missing otherUserId parameter" }, { status: 400 });
    }

    await clearConversation(Number(otherUserId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
