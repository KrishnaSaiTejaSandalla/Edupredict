import { post } from '@/api/client';
import { DriverLocation } from '@/store/location.store';
import { AxiosRequestConfig } from 'axios';

export type DriverLocationSyncPayload = DriverLocation & {
  driverId: string;
  busId: number;
  routeId: string | null;
  tripId: string;
  status: 'waiting_at_school' | 'trip_started' | 'arriving' | 'reached_stop' | 'trip_completed';
  currentStopId?: number | null;
  nextStopId?: number | null;
  remainingStops?: number | null;
};

export async function syncDriverLocationApi(payload: DriverLocationSyncPayload) {
  return post('/mobile/driver/location', payload, { skipAuthHandler: true } as AxiosRequestConfig);
}
