import { createHmac, timingSafeEqual } from 'crypto';

const configuredSecret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET;
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT signing secret is not configured');
}
// The fallback is restricted to local development only. Production starts fail
// closed when a signing secret is absent.
const JWT_SECRET = configuredSecret || 'edupredict-development-only-secret';

interface JwtPayload {
  sub: number;
  role: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(value: string): string {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signSegment(header: string, payload: string): string {
  return createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  expiresInSeconds = 60 * 60 * 24 * 7,
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(
    JSON.stringify({
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    }),
  );
  const signature = signSegment(header, body);
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = signSegment(header, payload);

  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;
  } catch {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
    if (!decoded.sub || !decoded.exp) return null;
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}
