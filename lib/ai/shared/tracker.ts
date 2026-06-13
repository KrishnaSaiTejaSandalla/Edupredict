'use server';

import { db } from '@/lib/db';
import { aiGenerations } from '@/lib/schema';
import type { AIGenerationType, AIGenerationStatus } from './types';

export async function trackAIGeneration({
  userId,
  type,
  prompt,
  status = 'completed',
  resultUrl,
}: {
  userId: number;
  type: AIGenerationType;
  prompt?: string;
  status?: AIGenerationStatus;
  resultUrl?: string;
}): Promise<void> {
  try {
    await db.insert(aiGenerations).values({
      userId,
      type,
      prompt: prompt ?? null,
      status,
      resultUrl: resultUrl ?? null,
      createdAt: new Date(),
    });
  } catch (err) {
    // Non-fatal: tracking failure should not break user-facing flows
    console.error('[AI Tracker] Failed to log generation:', err);
  }
}
