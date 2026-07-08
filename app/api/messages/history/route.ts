import { NextRequest, NextResponse } from "next/server";
import { getMessages } from "@/lib/message-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const otherUserId = Number(searchParams.get("otherUserId"));
  const limit = Number(searchParams.get("limit") || "50");
  const offset = Number(searchParams.get("offset") || "0");

  if (!otherUserId) {
    return NextResponse.json({ error: "Missing otherUserId parameter" }, { status: 400 });
  }

  try {
    const messages = await getMessages(otherUserId, limit, offset);
    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
