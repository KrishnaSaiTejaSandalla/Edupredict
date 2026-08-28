import { NextResponse } from 'next/server';
import { buildDriverSessionInfo } from '@/lib/driver-auth';
import { getBearerToken, verifyJwt } from '@/lib/jwt';

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);

    if (!token) {
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

    const payload = verifyJwt(token);
    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json(
        {
          success: false,
          message: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    const driver = await buildDriverSessionInfo(payload.sub);
    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          message: 'This account is not authorized for Driver App.',
          code: 'UNAUTHORIZED_ROLE',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session valid.',
      timestamp: new Date().toISOString(),
      data: {
        token,
        role: driver.role,
        driver: {
          id: String(driver.id),
          name: driver.name,
          phone: driver.phone,
          email: driver.email,
          photoUrl: driver.photoUrl,
        },
        assignedBus: driver.assignedBus,
        assignedRoute: driver.assignedRoute,
        permissions: driver.permissions,
      },
    });
  } catch (error) {
    console.error('[mobile/driver/session]', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Server unavailable. Please try again later.',
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
