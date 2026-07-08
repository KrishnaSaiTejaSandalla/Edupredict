import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getParentChildren } from "@/lib/parent-actions";
import { getParentDashboardData } from "@/lib/parent-dashboard.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req, "parent");
    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const childrenList = await getParentChildren(user.id);
    if (childrenList.length === 0) {
      return NextResponse.json({ childrenList: [], data: null });
    }

    const { searchParams } = new URL(req.url);
    const studentIdParam = searchParams.get("studentId");
    
    const selectedStudent = studentIdParam
      ? childrenList.find((c) => c.studentId === Number(studentIdParam)) || childrenList[0]
      : childrenList[0];

    const data = await getParentDashboardData(user.id, selectedStudent.studentId, selectedStudent.classId);

    return NextResponse.json({
      childrenList,
      selectedStudent,
      data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
