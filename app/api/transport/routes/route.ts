import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  getAllRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
} from "@/lib/transport-actions";

export const dynamic = "force-dynamic";

// GET: Fetch all routes
export async function GET(req: NextRequest) {
  try {
    await requireRole("admin");
    const data = await getAllRoutes();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET transport routes error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// POST: Create or Update a route
export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const { id, routeName, type, isActive } = body;

    if (id) {
      const result = await updateRoute(Number(id), { routeName, type, isActive });
      return NextResponse.json(result);
    } else {
      const result = await createRoute({ routeName, type });
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error("POST transport route error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// DELETE: Remove a route
export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "Missing route id" }, { status: 400 });
    }

    const result = await deleteRoute(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE transport route error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
