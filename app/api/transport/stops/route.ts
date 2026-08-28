import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  getAllStops,
  getRouteStops,
  createStop,
  updateStop,
  deleteStop,
  saveRouteStops,
} from "@/lib/transport-actions";

export const dynamic = "force-dynamic";

// GET: Fetch all stops or route stops
export async function GET(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const routeIdParam = searchParams.get("routeId");

    if (routeIdParam) {
      const data = await getRouteStops(Number(routeIdParam));
      return NextResponse.json(data);
    }

    const data = await getAllStops();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET transport stops error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// POST: Create, Update, or save route stops
export async function POST(req: NextRequest) {
  try {
    await requireRole("admin");
    const body = await req.json();
    const { id, routeId, stopName, pickupTime, dropTime, latitude, longitude, sequenceNumber, stops } = body;

    // Handle saving stops for a route in bulk (reordering, adding, removing)
    if (routeId && Array.isArray(stops)) {
      await saveRouteStops(Number(routeId), stops);
      return NextResponse.json({ success: true });
    }

    if (id) {
      const result = await updateStop(Number(id), {
        routeId: Number(routeId),
        stopName,
        pickupTime,
        dropTime,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        sequenceNumber: sequenceNumber ? Number(sequenceNumber) : undefined,
      });
      return NextResponse.json(result);
    } else {
      const result = await createStop({
        routeId: Number(routeId),
        stopName,
        pickupTime,
        dropTime,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
      });
      return NextResponse.json(result);
    }
  } catch (error: any) {
    console.error("POST transport stop error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// DELETE: Remove a stop
export async function DELETE(req: NextRequest) {
  try {
    await requireRole("admin");
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "Missing stop id" }, { status: 400 });
    }

    const result = await deleteStop(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE transport stop error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
