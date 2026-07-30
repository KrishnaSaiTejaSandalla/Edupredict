// ============================================================
// Trips API — Placeholder functions
// ============================================================

import { Trip, TripHistory } from '@/types/trip.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '@/types/api.types';
import { get, post } from './client';

// GET /trips/active — currently active trip
export async function getActiveTripApi(): Promise<ApiResponse<Trip | null>> {
  return get<Trip | null>('/trips/active');
}

// GET /trips/upcoming
export async function getUpcomingTripsApi(): Promise<ApiResponse<Trip[]>> {
  return get<Trip[]>('/trips/upcoming');
}

// GET /trips/history
export async function getTripHistoryApi(
  params?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<TripHistory>>> {
  return get<PaginatedResponse<TripHistory>>('/trips/history', { params });
}

// POST /trips/:id/start
export async function startTripApi(tripId: string): Promise<ApiResponse<Trip>> {
  return post<Trip>(`/trips/${tripId}/start`);
}

// POST /trips/:id/complete
export async function completeTripApi(tripId: string): Promise<ApiResponse<Trip>> {
  return post<Trip>(`/trips/${tripId}/complete`);
}

// GET /mobile/driver/trip-details — fetch assigned route, stops, and students
export async function getTripDetailsApi(): Promise<ApiResponse<any>> {
  return get<any>('/mobile/driver/trip-details');
}

// GET /notifications/latest — fetch latest notifications/announcements
export async function getNotificationsApi(): Promise<ApiResponse<any[]>> {
  return get<any[]>('/notifications/latest');
}
