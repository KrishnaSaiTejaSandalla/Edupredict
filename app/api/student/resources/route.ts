import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStudentResources } from "@/lib/student-resources.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getStudentResources(user.id);
    return NextResponse.json({
      availableResources: data.availableResources.map(r => ({
        ...r,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString()
      })),
      bookmarkedIds: data.bookmarkedIds,
      progressList: data.progressList,
      weakSubjects: data.weakSubjects,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
