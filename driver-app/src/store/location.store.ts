import { create } from 'zustand';

export type GPSQuality = 'excellent' | 'good' | 'weak' | 'lost';
export type LocationPermissionState = 'unknown' | 'granted' | 'denied' | 'foreground_only';
export type LocationSyncStatus = 'idle' | 'uploading' | 'connected' | 'offline' | 'queued' | 'error';

export interface DriverLocation {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface QueuedLocationUpdate extends DriverLocation {
  id: string;
  tripId?: string;
  status?: 'waiting_at_school' | 'trip_started' | 'arriving' | 'reached_stop' | 'trip_completed';
  readyForSync: boolean;
}

interface LocationStore {
  currentLocation: DriverLocation | null;
  lastLocation: DriverLocation | null;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  tripDistance: number;
  routeHistory: DriverLocation[];
  queuedUpdates: QueuedLocationUpdate[];
  gpsQuality: GPSQuality;
  permissionState: LocationPermissionState;
  isTracking: boolean;
  isBackgroundTracking: boolean;
  isOnline: boolean;
  syncStatus: LocationSyncStatus;
  lastUpdatedAt: number | null;
  lastSyncedAt: number | null;
  error: string | null;

  ingestLocation: (location: DriverLocation, distanceDelta: number, status?: QueuedLocationUpdate['status']) => void;
  setPermissionState: (state: LocationPermissionState) => void;
  setTrackingState: (tracking: boolean, backgroundTracking?: boolean) => void;
  setNetworkOnline: (isOnline: boolean) => void;
  markQueueReady: () => void;
  removeQueuedUpdates: (ids: string[]) => void;
  clearQueue: () => void;
  setSyncStatus: (status: LocationSyncStatus) => void;
  setLastSyncedAt: (timestamp: number) => void;
  setError: (error: string | null) => void;
  resetTripLocation: () => void;
  reset: () => void;
}

const initialState = {
  currentLocation: null as DriverLocation | null,
  lastLocation: null as DriverLocation | null,
  speed: null as number | null,
  heading: null as number | null,
  accuracy: null as number | null,
  tripDistance: 0,
  routeHistory: [] as DriverLocation[],
  queuedUpdates: [] as QueuedLocationUpdate[],
  gpsQuality: 'lost' as GPSQuality,
  permissionState: 'unknown' as LocationPermissionState,
  isTracking: false,
  isBackgroundTracking: false,
  isOnline: true,
  syncStatus: 'idle' as LocationSyncStatus,
  lastUpdatedAt: null as number | null,
  lastSyncedAt: null as number | null,
  error: null as string | null,
};

function getGPSQuality(accuracy: number | null): GPSQuality {
  if (accuracy == null) return 'lost';
  if (accuracy <= 10) return 'excellent';
  if (accuracy <= 30) return 'good';
  if (accuracy <= 80) return 'weak';
  return 'lost';
}

export const useLocationStore = create<LocationStore>((set, get) => ({
  ...initialState,

  ingestLocation: (location, distanceDelta, status) =>
    set((state) => {
      const nextQueueItem: QueuedLocationUpdate = {
        ...location,
        id: `${location.timestamp}-${Math.round(location.latitude * 100000)}-${Math.round(location.longitude * 100000)}`,
        status,
        readyForSync: state.isOnline,
      };

      return {
        lastLocation: state.currentLocation,
        currentLocation: location,
        speed: location.speed,
        heading: location.heading,
        accuracy: location.accuracy,
        gpsQuality: getGPSQuality(location.accuracy),
        tripDistance: state.tripDistance + distanceDelta,
        routeHistory: [...state.routeHistory.slice(-499), location],
        queuedUpdates: [...state.queuedUpdates, nextQueueItem],
        lastUpdatedAt: location.timestamp,
        error: null,
      };
    }),

  setPermissionState: (permissionState) => set({ permissionState }),

  setTrackingState: (isTracking, isBackgroundTracking = get().isBackgroundTracking) =>
    set({ isTracking, isBackgroundTracking }),

  setNetworkOnline: (isOnline) =>
    set((state) => ({
      isOnline,
      syncStatus: isOnline ? (state.queuedUpdates.length > 0 ? 'queued' : 'connected') : 'offline',
      queuedUpdates: isOnline
        ? state.queuedUpdates.map((item) => ({ ...item, readyForSync: true }))
        : state.queuedUpdates,
    })),

  markQueueReady: () =>
    set((state) => ({
      syncStatus: state.queuedUpdates.length > 0 ? 'queued' : state.syncStatus,
      queuedUpdates: state.queuedUpdates.map((item) => ({ ...item, readyForSync: true })),
    })),

  removeQueuedUpdates: (ids) =>
    set((state) => {
      const removeIds = new Set(ids);
      const queuedUpdates = state.queuedUpdates.filter((item) => !removeIds.has(item.id));
      return {
        queuedUpdates,
        syncStatus: queuedUpdates.length === 0 && state.isOnline ? 'connected' : state.syncStatus,
      };
    }),

  clearQueue: () => set({ queuedUpdates: [] }),

  setSyncStatus: (syncStatus) => set({ syncStatus }),

  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

  setError: (error) => set({ error }),

  resetTripLocation: () =>
    set({
      lastLocation: null,
      currentLocation: null,
      speed: null,
      heading: null,
      accuracy: null,
      tripDistance: 0,
      routeHistory: [],
      queuedUpdates: [],
      gpsQuality: 'lost',
      syncStatus: 'idle',
      lastUpdatedAt: null,
      lastSyncedAt: null,
      error: null,
    }),

  reset: () => set(initialState),
}));
