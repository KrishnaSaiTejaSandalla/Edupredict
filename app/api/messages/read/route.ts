import { NextRequest, NextResponse } from "next/server";
import { markMessagesRead } from "@/lib/message-actions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { senderId } = await req.json();
    if (!senderId) {
      return NextResponse.json({ error: "Missing senderId" }, { status: 400 });
    }

    const result = await markMessagesRead(Number(senderId));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
