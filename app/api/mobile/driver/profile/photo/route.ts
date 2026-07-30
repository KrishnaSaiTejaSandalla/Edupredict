import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getBearerToken, verifyJwt } from '@/lib/jwt';
import { buildDriverSessionInfo } from '@/lib/driver-auth';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const payload = verifyJwt(token);
    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const userId = payload.sub;

    const formData = await req.formData();
    const file = (formData.get('image') || formData.get('file')) as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, message: 'No image file provided' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Only PNG, JPG, JPEG, and WEBP files are allowed' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File size must be under 5MB' }, { status: 400 });
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'drivers');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `driver-${userId}-${Date.now()}.${ext}`;
    const filePath = join(uploadsDir, fileName);
    const publicUrl = `/uploads/drivers/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    await db
      .update(users)
      .set({ profileImageUrl: publicUrl, updatedAt: new Date() })
      .where(eq(users.id, userId));

    const updatedDriver = await buildDriverSessionInfo(userId);

    return NextResponse.json({
      success: true,
      message: 'Profile photo updated successfully',
      profileImageUrl: publicUrl,
      data: updatedDriver,
    });
  } catch (error: any) {
    console.error('[mobile/driver/profile/photo POST]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
    }

    const payload = verifyJwt(token);
    if (!payload || payload.role.toLowerCase() !== 'driver') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const userId = payload.sub;

    await db
      .update(users)
      .set({ profileImageUrl: null, updatedAt: new Date() })
      .where(eq(users.id, userId));

    const updatedDriver = await buildDriverSessionInfo(userId);

    return NextResponse.json({
      success: true,
      message: 'Profile photo removed successfully',
      data: updatedDriver,
    });
  } catch (error: any) {
    console.error('[mobile/driver/profile/photo DELETE]', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to remove photo' },
      { status: 500 }
    );
  }
}
