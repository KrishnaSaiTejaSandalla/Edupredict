import { NextResponse } from 'next/server';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { saveDriverLocation, type LiveTripStatus } from '@/lib/bus-tracking.service';

type DriverLocationBody = {
  driverId?: number | string;
  busId?: number | string;
  routeId?: string | null;
  tripId?: string;
  latitude?: number | string;
  longitude?: number | string;
  speed?: number | string | null;
  heading?: number | string | null;
  accuracy?: number | string | null;
  timestamp?: string | number | null;
  status?: LiveTripStatus;
  currentStopId?: number | string | null;
  nextStopId?: number | string | null;
  remainingStops?: number | string | null;
};

function toRequiredNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  return toRequiredNumber(value);
}

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    const payload = token ? verifyJwt(token) : null;

    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json(
        {
          success: false,
          message: 'Authentication required.',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    const body = (await req.json()) as DriverLocationBody;
    const busId = toRequiredNumber(body.busId);
    const latitude = toRequiredNumber(body.latitude);
    const longitude = toRequiredNumber(body.longitude);
    const tripId = body.tripId?.trim();

    if (!busId || latitude === null || longitude === null || !tripId) {
      return NextResponse.json(
        {
          success: false,
          message: 'busId, tripId, latitude, and longitude are required.',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const snapshot = await saveDriverLocation({
      driverId: payload.sub,
      busId,
      routeId: body.routeId ?? null,
      tripId,
      latitude,
      longitude,
      speed: toOptionalNumber(body.speed),
      heading: toOptionalNumber(body.heading),
      accuracy: toOptionalNumber(body.accuracy),
      timestamp: body.timestamp ?? null,
      status: body.status,
      currentStopId: toOptionalNumber(body.currentStopId),
      nextStopId: toOptionalNumber(body.nextStopId),
      remainingStops: toOptionalNumber(body.remainingStops),
    });

    return NextResponse.json({
      success: true,
      message: 'Location synced.',
      timestamp: new Date().toISOString(),
      data: snapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'LOCATION_SYNC_FAILED';
    const status = message === 'DRIVER_BUS_SCOPE_VIOLATION' ? 403 : 500;

    return NextResponse.json(
      {
        success: false,
        message:
          status === 403
            ? 'Driver is not authorized to update this bus.'
            : 'Unable to sync driver location.',
        code: message,
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status },
    );
  }
}
