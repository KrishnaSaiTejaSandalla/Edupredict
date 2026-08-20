import { NextRequest, NextResponse } from "next/server";
import { getSharedMedia } from "@/lib/message-actions";
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

    if (!otherUserId) {
      return NextResponse.json({ error: "Missing otherUserId parameter" }, { status: 400 });
    }

    const media = await getSharedMedia(otherUserId);
    return NextResponse.json(media);
  } catch (error: any) {
    const errorMsg = error.message || "Failed to retrieve shared media";
    const isForbidden = errorMsg.toLowerCase().includes("forbidden");
    return NextResponse.json(
      { error: errorMsg },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
