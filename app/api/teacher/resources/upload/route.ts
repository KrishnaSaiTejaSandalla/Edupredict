import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { join } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req, 'teacher');
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_UPLOAD_BYTES || !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Invalid file" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'resources');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const extension = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1].replace(/[^a-z0-9]/gi, '');
    const uniqueName = `${crypto.randomUUID()}.${extension}`;
    const filePath = join(uploadsDir, uniqueName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/resources/${uniqueName}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    console.error('Resource upload failed:', error);
    return NextResponse.json({ error: 'Upload could not be completed' }, { status: 500 });
  }
}
