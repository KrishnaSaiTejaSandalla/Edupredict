import { NextRequest, NextResponse } from "next/server";
import { markMessagesRead } from "@/lib/message-actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { senderId } = await req.json();
    if (!senderId) {
      return NextResponse.json({ error: "Missing senderId" }, { status: 400 });
    }

    const result = await markMessagesRead(Number(senderId));
    return NextResponse.json(result);
  } catch (error: any) {
    const errorMsg = error.message || "Failed to mark messages read";
    const isForbidden = errorMsg.toLowerCase().includes("forbidden");
    return NextResponse.json(
      { error: errorMsg },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
