'use server';

import { db } from '@/lib/db';
import { userAvatars, users } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { buildDiceBearUrl, AVATAR_STYLE_MAP } from '@/lib/ai/providers/dicebear';
import { trackAIGeneration } from '@/lib/ai/shared/tracker';
import type { GeneratedAvatar } from '@/lib/ai/shared/types';

/**
 * Generate 5 avatar options for a user and persist them to userAvatars.
 * Uses DiceBear for deterministic, style-varied results.
 * Each call creates a fresh batch with a randomized seed component.
 */
export async function generateUserAvatars(userId: number): Promise<GeneratedAvatar[]> {
  // Enforce 15-avatar cap per user: check existing count and delete oldest if needed
  const existingAvatars = await db
    .select()
    .from(userAvatars)
    .where(eq(userAvatars.userId, userId))
    .orderBy(desc(userAvatars.createdAt));

  if (existingAvatars.length >= 15) {
    // Keep the newest 10, delete all older ones to make space for 5 new ones
    const toDelete = existingAvatars.slice(10);
    for (const av of toDelete) {
      await db.delete(userAvatars).where(eq(userAvatars.id, av.id));
    }
  }

  // Use a unique seed per generation session so re-generating gives new results
  const sessionSeed = `${userId}-${Date.now()}`;

  const avatars: GeneratedAvatar[] = AVATAR_STYLE_MAP.map((s) => ({
    style: s.key as GeneratedAvatar['style'],
    styleLabel: s.label,
    imageUrl: buildDiceBearUrl({
      seed: `${sessionSeed}-${s.key}`,
      style: s.style,
      size: 256,
    }),
  }));

  // Persist to userAvatars table (keep history, don't delete old ones)
  await db.insert(userAvatars).values(
    avatars.map((av) => ({
      userId,
      imageUrl: av.imageUrl,
      style: av.style,
      isSelected: false,
      createdAt: new Date(),
    }))
  );

  // Track in aiGenerations
  await trackAIGeneration({
    userId,
    type: 'AVATAR',
    prompt: `Generated 5 avatar styles: ${AVATAR_STYLE_MAP.map((s) => s.label).join(', ')}`,
    status: 'completed',
    resultUrl: avatars[0].imageUrl,
  });

  return avatars;
}

/**
 * Select an avatar as the user's active profile image.
 * Updates isSelected on the avatar row and sets users.profileImageUrl.
 */
export async function selectUserAvatar(
  userId: number,
  avatarId: number,
  imageUrl: string
): Promise<{ success: true }> {
  // Clear all previous selections for this user
  await db
    .update(userAvatars)
    .set({ isSelected: false })
    .where(eq(userAvatars.userId, userId));

  // Mark the chosen one
  await db
    .update(userAvatars)
    .set({ isSelected: true })
    .where(eq(userAvatars.id, avatarId));

  // Write to users.profileImageUrl so it shows everywhere
  await db
    .update(users)
    .set({ profileImageUrl: imageUrl, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * Get the latest batch of avatars for a user (most recent 5 + selected one).
 */
export async function getUserAvatars(userId: number) {
  return db
    .select()
    .from(userAvatars)
    .where(eq(userAvatars.userId, userId))
    .orderBy(userAvatars.createdAt)
    .limit(50);
}
