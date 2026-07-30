import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import NetInfo, { NetInfoSubscription } from '@react-native-community/netinfo';
import { syncDriverLocationApi } from '@/api/location';
import { DriverLocation, useLocationStore } from '@/store/location.store';
import { useAuthStore } from '@/store/auth.store';
import { useTripStore } from '@/store/trip.store';

const BACKGROUND_LOCATION_TASK = 'edupredict-driver-background-location';
const LOCATION_INTERVAL_MS = 5000;
const LOCATION_DISTANCE_METERS = 10;
let connectivityUnsubscribe: NetInfoSubscription | null = null;
let isSyncing = false;
let webWatchId: number | null = null;

type LocationTaskData = {
  locations?: Location.LocationObject[];
};

function toDriverLocation(location: Location.LocationObject): DriverLocation {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    speed: location.coords.speed,
    heading: location.coords.heading,
    accuracy: location.coords.accuracy,
    timestamp: location.timestamp,
  };
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(from: DriverLocation, to: DriverLocation): number {
  const earthRadius = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function getDistanceDelta(location: DriverLocation): number {
  const previous = useLocationStore.getState().currentLocation;
  if (!previous) return 0;

  const delta = calculateDistanceMeters(previous, location);
  return Number.isFinite(delta) && delta >= 0 ? delta : 0;
}

function detectStopArrival(location: DriverLocation): void {
  const trip = useTripStore.getState();
  const stop = trip.stops[trip.currentStopIndex];
  if (!stop || trip.completedStopIds.includes(stop.id)) return;

  const distanceToStop = calculateDistanceMeters(location, {
    latitude: stop.latitude,
    longitude: stop.longitude,
    speed: null,
    heading: null,
    accuracy: null,
    timestamp: location.timestamp,
  });

  // 30-50 meters arrival radius (using 45m as optimal midpoint)
  if (distanceToStop <= 45 && !trip.hasArrivedAtCurrent) {
    trip.markArrived();
  }
}

function getLiveStatus() {
  const trip = useTripStore.getState();
  if (trip.tripStatus === 'completed') return 'trip_completed' as const;
  if (trip.tripStatus === 'idle') return 'waiting_at_school' as const;

  if (trip.hasArrivedAtCurrent) {
    return 'reached_stop' as const;
  }

  // Calculate distance to next stop to see if approaching (within 300m)
  const stop = trip.stops[trip.currentStopIndex];
  const currentLoc = useLocationStore.getState().currentLocation;
  if (stop && currentLoc) {
    const dist = calculateDistanceMeters(currentLoc, {
      latitude: stop.latitude,
      longitude: stop.longitude,
      speed: null,
      heading: null,
      accuracy: null,
      timestamp: Date.now(),
    });
    if (dist <= 300) {
      return 'arriving' as const;
    }
  }

  return 'trip_started' as const;
}

function getTripId(): string {
  const tripState = useTripStore.getState();
  const activeTripId = tripState.activeTrip.trip?.id;
  if (activeTripId) return String(activeTripId);
  return `driver-local-${new Date().toISOString().slice(0, 10)}`;
}

function getRemainingStops(): number {
  const trip = useTripStore.getState();
  return Math.max(0, trip.stops.length - trip.completedStopIds.length);
}

async function syncQueuedUpdates(): Promise<void> {
  const locationState = useLocationStore.getState();
  const authState = useAuthStore.getState();
  const driver = authState.driver;
  const bus = driver?.assignedBus;

  if (!locationState.isOnline) {
    locationState.setSyncStatus('offline');
    return;
  }

  if (!driver || !bus) {
    locationState.setSyncStatus(locationState.queuedUpdates.length > 0 ? 'queued' : 'idle');
    return;
  }

  const readyUpdates = locationState.queuedUpdates.filter((item) => item.readyForSync).slice(0, 20);
  if (readyUpdates.length === 0) {
    locationState.setSyncStatus('connected');
    return;
  }

  if (isSyncing) return;
  isSyncing = true;
  useLocationStore.getState().setSyncStatus('uploading');

  const syncedIds: string[] = [];

  try {
    const trip = useTripStore.getState();
    const currentStop = trip.stops[trip.currentStopIndex];
    const nextStop = trip.stops[trip.currentStopIndex + 1];

    for (const update of readyUpdates) {
      const status = update.status ?? getLiveStatus();
      const isCompleted = status === 'trip_completed';

      await syncDriverLocationApi({
        latitude: update.latitude,
        longitude: update.longitude,
        speed: update.speed,
        heading: update.heading,
        accuracy: update.accuracy,
        timestamp: update.timestamp,
        driverId: driver.id,
        busId: bus.id,
        routeId: bus.routeId ? String(bus.routeId) : (driver.assignedRoute ?? null),
        tripId: update.tripId ?? getTripId(),
        status,
        currentStopId: isCompleted ? null : (currentStop ? Number(currentStop.id) : null),
        nextStopId: isCompleted ? null : (nextStop ? Number(nextStop.id) : null),
        remainingStops: isCompleted ? 0 : Math.max(0, trip.stops.length - trip.currentStopIndex),
      });
      syncedIds.push(update.id);
    }

    const store = useLocationStore.getState();
    store.removeQueuedUpdates(syncedIds);
    store.setLastSyncedAt(Date.now());
    useLocationStore
      .getState()
      .setSyncStatus(useLocationStore.getState().queuedUpdates.length > 0 ? 'queued' : 'connected');
  } catch (error) {
    useLocationStore.getState().setSyncStatus('error');
    useLocationStore.getState().setError('Location upload queued. Sync will retry automatically.');
  } finally {
    isSyncing = false;
  }
}

function smoothLocation(location: DriverLocation, previous: DriverLocation | null): DriverLocation {
  if (!previous) return location;

  // 1. Discard updates with very poor accuracy radius (accuracy > 80 meters)
  if (location.accuracy && location.accuracy > 80) {
    return previous;
  }

  const distance = calculateDistanceMeters(previous, location);
  const speedKmh = (location.speed ?? 0) * 3.6;

  // 2. Ignore tiny jitter movements when the bus is stationary or moving extremely slow
  if (distance < 3 && speedKmh < 3) {
    return {
      ...previous,
      timestamp: location.timestamp,
      speed: location.speed,
      heading: location.heading,
      accuracy: location.accuracy,
    };
  }

  // 3. Exponential Moving Average (EMA) smoothing for fluid marker movements
  // Dynamic smoothing coefficient based on distance and movement speed
  let alpha = 0.5;
  if (distance > 30) {
    // Large jump: snap directly (e.g. initial GPS lock or signal restoration)
    alpha = 0.9;
  } else if (speedKmh > 15) {
    // Normal driving speed: lower latency, track closer
    alpha = 0.75;
  } else {
    // Slow speed: higher smoothing to prevent stationary drifting/jumping
    alpha = 0.4;
  }

  const smoothedLat = alpha * location.latitude + (1 - alpha) * previous.latitude;
  const smoothedLng = alpha * location.longitude + (1 - alpha) * previous.longitude;

  return {
    ...location,
    latitude: smoothedLat,
    longitude: smoothedLng,
  };
}

function ingestLocationObject(locationObject: Location.LocationObject): void {
  const rawLocation = toDriverLocation(locationObject);
  const previous = useLocationStore.getState().currentLocation;
  const location = smoothLocation(rawLocation, previous);

  const distanceDelta = getDistanceDelta(location);
  useLocationStore.getState().ingestLocation(location, distanceDelta);
  detectStopArrival(location);
  void syncQueuedUpdates();
}

if (Platform.OS !== 'web') {
  TaskManager.defineTask<LocationTaskData>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      useLocationStore.getState().setError(error.message);
      return;
    }

    data?.locations?.forEach(ingestLocationObject);
  });
}

async function ensureBackgroundTaskRegistered(): Promise<void> {
  const isDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
  if (!isDefined) {
    throw new Error('Background location task is not defined.');
  }
}

export const LocationService = {
  taskName: BACKGROUND_LOCATION_TASK,

  startConnectivityMonitoring: (): void => {
    if (connectivityUnsubscribe) return;

    connectivityUnsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      useLocationStore.getState().setNetworkOnline(isOnline);
      if (isOnline) {
        useLocationStore.getState().markQueueReady();
        void syncQueuedUpdates();
      }
    });
  },

  stopConnectivityMonitoring: (): void => {
    connectivityUnsubscribe?.();
    connectivityUnsubscribe = null;
  },

  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        useLocationStore.getState().setPermissionState('denied');
        useLocationStore.getState().setError('Geolocation is not supported by this browser.');
        return false;
      }
      useLocationStore.getState().setPermissionState('granted');
      useLocationStore.getState().setError(null);
      return true;
    }

    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== Location.PermissionStatus.GRANTED) {
      useLocationStore.getState().setPermissionState('denied');
      useLocationStore.getState().setError('Location permission denied.');
      return false;
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== Location.PermissionStatus.GRANTED) {
      useLocationStore.getState().setPermissionState('foreground_only');
      useLocationStore.getState().setError('Background location permission denied.');
      return false;
    }

    useLocationStore.getState().setPermissionState('granted');
    useLocationStore.getState().setError(null);
    return true;
  },

  startTripTracking: async (): Promise<boolean> => {
    LocationService.startConnectivityMonitoring();
    const permissionGranted = await LocationService.requestPermissions();
    if (!permissionGranted) return false;

    if (Platform.OS === 'web') {
      if (webWatchId !== null) {
        navigator.geolocation.clearWatch(webWatchId);
      }
      webWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const locationObject: Location.LocationObject = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy,
              altitudeAccuracy: null,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          };
          ingestLocationObject(locationObject);
        },
        (error) => {
          useLocationStore.getState().setError(error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: LOCATION_INTERVAL_MS,
          maximumAge: 0,
        }
      );

      // Try to get initial location immediately on web
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationObject: Location.LocationObject = {
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy,
              altitudeAccuracy: null,
              heading: position.coords.heading,
              speed: position.coords.speed,
            },
            timestamp: position.timestamp,
          };
          ingestLocationObject(locationObject);
        },
        (error) => {
          console.warn('[location/getCurrentPosition]', error);
        },
        { enableHighAccuracy: true }
      );

      useLocationStore.getState().setTrackingState(true, true);
      return true;
    }

    await ensureBackgroundTaskRegistered();

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (!hasStarted) {
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: LOCATION_INTERVAL_MS,
        distanceInterval: LOCATION_DISTANCE_METERS,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'EduPredict trip tracking',
          notificationBody: 'Live trip GPS is active until the trip ends.',
          notificationColor: '#2563EB',
        },
      });
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    ingestLocationObject(current);

    useLocationStore.getState().setTrackingState(true, true);
    return true;
  },

  stopTripTracking: async (): Promise<void> => {
    if (Platform.OS === 'web') {
      if (webWatchId !== null) {
        navigator.geolocation.clearWatch(webWatchId);
        webWatchId = null;
      }
      useLocationStore.getState().setTrackingState(false, false);
      return;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    useLocationStore.getState().setTrackingState(false, false);
  },

  getCurrentLocationOnce: async (): Promise<DriverLocation | null> => {
    const permissionGranted = await LocationService.requestPermissions();
    if (!permissionGranted) return null;

    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location: DriverLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              speed: position.coords.speed,
              heading: position.coords.heading,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            };
            useLocationStore.getState().ingestLocation(location, 0);
            resolve(location);
          },
          (error) => {
            useLocationStore.getState().setError(error.message);
            resolve(null);
          },
          { enableHighAccuracy: true }
        );
      });
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const location = toDriverLocation(current);
    useLocationStore.getState().ingestLocation(location, 0);
    return location;
  },

  setConnectivityStatus: (isOnline: boolean): void => {
    useLocationStore.getState().setNetworkOnline(isOnline);
  },

  markQueuedUpdatesReady: (): void => {
    useLocationStore.getState().markQueueReady();
    void syncQueuedUpdates();
  },

  syncQueuedUpdates,

  syncTripCompleted: async (): Promise<void> => {
    const currentLocation = useLocationStore.getState().currentLocation;
    if (currentLocation) {
      useLocationStore.getState().ingestLocation(
        { ...currentLocation, timestamp: Date.now() },
        0,
        'trip_completed',
      );
    }
    await syncQueuedUpdates();
  },
};

export { BACKGROUND_LOCATION_TASK, LOCATION_DISTANCE_METERS, LOCATION_INTERVAL_MS };
