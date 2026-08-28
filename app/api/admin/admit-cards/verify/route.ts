import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { verifyStudentQr } from '@/lib/admit-card-actions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req, 'admin');
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid QR token parameter.' }, { status: 400 });
    }

    const verificationResult = await verifyStudentQr(token);

    if (!verificationResult.isValid) {
      return NextResponse.json(
        { isValid: false, message: verificationResult.message || 'Invalid or unrecognized student QR code' },
        { status: 404 }
      );
    }

    return NextResponse.json(verificationResult);
  } catch (error: any) {
    console.error('Error verifying admit card QR API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
