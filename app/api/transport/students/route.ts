import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  getStudentsForTransport,
  assignStudentToBus,
  removeStudentFromBus,
  bulkAssignStudentsToBus,
} from "@/lib/transport-actions";

export const dynamic = "force-dynamic";

// GET: Fetch students with filters
export async function GET(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);

    const classId = searchParams.get("classId") ? Number(searchParams.get("classId")) : undefined;
    const busId = searchParams.get("busId") ? Number(searchParams.get("busId")) : undefined;
    const routeId = searchParams.get("routeId") ? Number(searchParams.get("routeId")) : undefined;
    const search = searchParams.get("search") || undefined;

    const data = await getStudentsForTransport({ classId, busId, routeId, search });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET transport students error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// POST: Assign student(s) to a bus
export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await req.json();

    const { studentId, studentIds, busId, routeId, pickupStopId, dropStopId, morningPickupTime, returnTime } = body;

    if (!busId) {
      return NextResponse.json({ error: "Missing busId" }, { status: 400 });
    }

    if (Array.isArray(studentIds)) {
      const result = await bulkAssignStudentsToBus(studentIds, busId);
      return NextResponse.json(result);
    }

    if (studentId) {
      if (!routeId) {
        return NextResponse.json({ error: "Missing routeId" }, { status: 400 });
      }
      const result = await assignStudentToBus(
        studentId,
        busId,
        routeId,
        pickupStopId,
        dropStopId,
        morningPickupTime,
        returnTime
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Missing studentId or studentIds" }, { status: 400 });
  } catch (error: any) {
    console.error("POST assign student error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// DELETE: Remove student assignment
export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);

    const studentId = Number(searchParams.get("studentId"));
    const busId = Number(searchParams.get("busId"));

    if (!studentId || !busId) {
      return NextResponse.json({ error: "Missing studentId or busId" }, { status: 400 });
    }

    const result = await removeStudentFromBus(studentId, busId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE remove assignment error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
