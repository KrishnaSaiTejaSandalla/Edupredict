import { NextRequest, NextResponse } from "next/server";
import { getSharedMedia } from "@/lib/message-actions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const otherUserId = Number(searchParams.get("otherUserId"));

    if (!otherUserId) {
      return NextResponse.json({ error: "Missing otherUserId parameter" }, { status: 400 });
    }

    const media = await getSharedMedia(otherUserId);
    return NextResponse.json(media);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
