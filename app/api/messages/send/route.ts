import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/message-actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { receiverId, message, attachmentUrl, mediaType, mediaSize, fileName } = await req.json();
    if (!receiverId) {
      return NextResponse.json({ error: "Missing receiverId" }, { status: 400 });
    }

    const newMsg = await sendMessage(
      Number(receiverId),
      message || "",
      attachmentUrl,
      mediaType,
      mediaSize,
      fileName
    );
    return NextResponse.json(newMsg);
  } catch (error: any) {
    const errorMsg = error.message || "Failed to send message";
    const isForbidden = errorMsg.toLowerCase().includes("forbidden") || errorMsg.toLowerCase().includes("not permitted");
    return NextResponse.json(
      { error: errorMsg },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
