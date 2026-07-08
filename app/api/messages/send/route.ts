import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/message-actions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { receiverId, message, attachmentUrl } = await req.json();
    if (!receiverId) {
      return NextResponse.json({ error: "Missing receiverId" }, { status: 400 });
    }

    const newMsg = await sendMessage(Number(receiverId), message, attachmentUrl);
    return NextResponse.json(newMsg);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
