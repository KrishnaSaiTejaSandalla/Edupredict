import { NextRequest, NextResponse } from "next/server";
import { deleteMessage } from "@/lib/message-actions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { messageId } = await req.json();
    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId parameter" }, { status: 400 });
    }

    await deleteMessage(Number(messageId));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
