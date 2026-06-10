import { randomBytes } from 'crypto';
import { db } from './db';
import { sessions, users } from './schema';
import { eq } from 'drizzle-orm';
import { SESSION_COOKIE_NAME } from './env';

export async function createSession(userId: number, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const token = randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  await db.insert(sessions).values({ userId, sessionToken: token, expiresAt });
  return { token, expiresAt };
}

export async function getSessionByToken(token: string) {
  const [s] = await db.select().from(sessions).where(eq(sessions.sessionToken, token)).limit(1);
  return s || null;
}

export async function deleteSessionByToken(token: string) {
  await db.delete(sessions).where(eq(sessions.sessionToken, token));
}

export async function getUserBySessionToken(token: string) {
  const session = await getSessionByToken(token);
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    await deleteSessionByToken(token);
    return null;
  }
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user || null;
}
