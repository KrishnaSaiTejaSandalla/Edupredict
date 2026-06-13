import { randomBytes } from 'crypto';
import { db } from './db';
import { sessions, users, schools } from './schema';
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
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      profileImageUrl: users.profileImageUrl,

      schoolId: users.schoolId,
      schoolName: schools.name,
      schoolLogoUrl: schools.logoUrl,
    })
    .from(users)
    .leftJoin(schools, eq(users.schoolId, schools.id))
    .where(eq(users.id, session.userId))
    .limit(1);

  const row = result[0];

  if (!row) return null;

  // If user has no schoolId (e.g. seeded admin accounts), fall back to first school
  // This mirrors the same fallback used in the settings page
  let schoolId = row.schoolId;
  let schoolName = row.schoolName;
  let schoolLogoUrl = row.schoolLogoUrl;

  if (!schoolId) {
    const [fallback] = await db
      .select({ id: schools.id, name: schools.name, logoUrl: schools.logoUrl })
      .from(schools)
      .limit(1);
    if (fallback) {
      schoolId = fallback.id;
      schoolName = fallback.name;
      schoolLogoUrl = fallback.logoUrl;
    }
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profileImageUrl: row.profileImageUrl,
    schoolId,
    schoolName,
    schoolLogoUrl,
  };
}