// ============================================================
// Driver API — Placeholder functions
// ============================================================

import { DriverProfile, DriverStats } from '@/types/driver.types';
import { ApiResponse } from '@/types/api.types';
import { get, put } from './client';

// GET /driver/profile
export async function getDriverProfileApi(): Promise<ApiResponse<DriverProfile>> {
  return get<DriverProfile>('/driver/profile');
}

// PUT /driver/profile
export async function updateDriverProfileApi(
  data: Partial<Pick<DriverProfile, 'phone' | 'email' | 'avatarUrl'>>,
): Promise<ApiResponse<DriverProfile>> {
  return put<DriverProfile>('/driver/profile', data);
}

// GET /driver/stats
export async function getDriverStatsApi(): Promise<ApiResponse<DriverStats>> {
  return get<DriverStats>('/driver/stats');
}
