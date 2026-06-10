import { NextResponse } from 'next/server';
import { deleteSessionByToken } from '@/lib/session';
import { SESSION_COOKIE_NAME } from '@/lib/env';

export async function POST(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  const token = match ? match[1] : null;
  if (token) await deleteSessionByToken(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE_NAME, value: '', httpOnly: true, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return res;
}
