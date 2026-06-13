import { NextResponse } from 'next/server';
import { getUserBySessionToken } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/env';

export async function GET(req: Request) {

  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(
    new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`)
  );

  const token = match ? match[1] : null;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const user = await getUserBySessionToken(token);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
}