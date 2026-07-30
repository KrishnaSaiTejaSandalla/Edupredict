import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@better-auth/utils/password';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import {
  buildDriverSessionInfo,
  findDriverByPhone,
} from '@/lib/driver-auth';
import { signJwt } from '@/lib/jwt';

interface LoginBody {
  mobileNumber?: string;
  password?: string;
}

async function verifyUserPassword(storedPassword: string, password: string): Promise<boolean> {
  if (
    storedPassword.startsWith('$2a$') ||
    storedPassword.startsWith('$2b$') ||
    storedPassword.startsWith('$2y$')
  ) {
    return bcrypt.compare(password, storedPassword);
  }

  try {
    return await verifyPassword(storedPassword, password);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;
    const mobileNumber = body.mobileNumber?.trim();
    const password = body.password;

    if (!mobileNumber || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'Mobile number and password are required.',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const user = await findDriverByPhone(mobileNumber);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid mobile number or password.',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    const validPassword = await verifyUserPassword(user.password, password);
    if (!validPassword) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid mobile number or password.',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 401 },
      );
    }

    if (user.role.toLowerCase() !== 'driver') {
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

    const driver = await buildDriverSessionInfo(user.id);
    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unable to load driver profile.',
          data: null,
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      );
    }

    const token = signJwt({ sub: user.id, role: 'driver' });

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: 'Login successful.',
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
    console.error('[mobile/driver/login]', error);
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
