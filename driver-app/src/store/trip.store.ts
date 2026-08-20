import { create } from 'zustand';
import { Trip, TripHistory } from '@/types/trip.types';
import { getTripDetailsApi } from '@/api/trips';
import { get as apiGet, post } from '@/api/client';
import { StorageService } from '@/services/storage.service';
import { useAuthStore } from '@/store/auth.store';
import { useLocationStore } from '@/store/location.store';

export type LiveTripStatus = 'idle' | 'in_progress' | 'paused' | 'completed';
export type BoardingState = 'present' | 'absent' | 'qr_pending' | 'boarded' | 'dropped';

export interface TripStudent {
  id: string;
  name: string;
  rollNumber: string;
  className: string;
  photoUrl?: string;
  status: BoardingState;
  boardedAt?: string;
  parentName?: string;
  parentPhone?: string;
  pickupTime?: string;
  dropTime?: string;
}

export interface TripStop {
  id: string;
  name: string;
  eta: string;
  expectedStudents: number;
  distanceFromPreviousKm: number;
  latitude: number;
  longitude: number;
  arrivalRadiusMeters: number;
  students: TripStudent[];
  dropTime?: string;
}

export interface TripSession {
  direction: 'morning' | 'evening';
  status: 'idle' | 'running' | 'completed';
  currentStop: TripStop | null;
  nextStop: TripStop | null;
  completedStops: string[];
  studentsPicked: string[];
  studentsDropped: string[];
}

interface TripSummary {
  studentsPicked: number;
  stopsCovered: number;
  distanceCoveredKm: number;
  durationSeconds: number;
}

export interface StudentBoardingCandidate {
  student: TripStudent;
  stop: TripStop;
  error?: 'wrong_bus' | 'wrong_stop' | 'already_boarded';
  assignedBusNumber?: string;
}

interface TripStore {
  tripStatus: LiveTripStatus;
  routeName: string;
  currentStopIndex: number;
  completedStopIds: string[];
  stops: TripStop[];
  elapsedSeconds: number;
  distanceCoveredKm: number;
  hasArrivedAtCurrent: boolean;
  tripId: string | null;
  boardingQueue: any[];
  activeTrip: {
    trip: Trip | null;
    currentStopIndex: number;
    isStarted: boolean;
  };
  history: TripHistory[];
  upcomingTrips: Trip[];
  isLoading: boolean;
  error: string | null;

  // New fields for Trip Session State Machine
  selectedDirection: 'morning' | 'evening';
  rawStops: TripStop[];
  tripSession: TripSession;

  initStore: () => Promise<void>;
  loadTripDetails: () => Promise<void>;
  startTrip: () => Promise<void>;
  pauseTrip: () => void;
  completeTrip: () => Promise<void>;
  resetTripEngine: () => void;
  markArrived: () => void;
  skipStop: () => void;
  nextStop: () => void;
  updateStudentStatus: (studentId: string, status: BoardingState) => Promise<void>;
  boardStudent: (studentId: string) => Promise<StudentBoardingCandidate | null>;
  undoBoard: (studentId: string) => Promise<void>;
  markAbsent: (studentId: string) => Promise<void>;
  pendingQR: (studentId: string) => Promise<void>;
  findStudentByQRCode: (qrValue: string) => Promise<StudentBoardingCandidate | null>;
  syncOfflineBoardingQueue: () => Promise<void>;
  tick: () => void;
  getSummary: () => TripSummary;

  setDirection: (direction: 'morning' | 'evening') => void;
  setActiveTrip: (trip: Trip | null) => void;
  setCurrentStop: (index: number) => void;
  setTripStarted: (started: boolean) => void;
  setHistory: (history: TripHistory[]) => void;
  setUpcomingTrips: (trips: Trip[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  tripStatus: 'idle' as LiveTripStatus,
  routeName: 'Loading route...',
  currentStopIndex: 0,
  completedStopIds: [] as string[],
  stops: [] as TripStop[],
  elapsedSeconds: 0,
  distanceCoveredKm: 0,
  hasArrivedAtCurrent: false,
  tripId: null as string | null,
  boardingQueue: [] as any[],
  activeTrip: {
    trip: null as Trip | null,
    currentStopIndex: 0,
    isStarted: false,
  },
  history: [] as TripHistory[],
  upcomingTrips: [] as Trip[],
  isLoading: false,
  error: null as string | null,

  // New initial fields
  selectedDirection: 'morning' as 'morning' | 'evening',
  rawStops: [] as TripStop[],
  tripSession: {
    direction: 'morning' as 'morning' | 'evening',
    status: 'idle' as 'idle' | 'running' | 'completed',
    currentStop: null as TripStop | null,
    nextStop: null as TripStop | null,
    completedStops: [] as string[],
    studentsPicked: [] as string[],
    studentsDropped: [] as string[],
  },
};

function normalizeQRValue(value: string): string {
  return value.trim().toLowerCase();
}

function parseStudentIdFromQR(val: string): string | null {
  if (val.startsWith('edupredict:student:')) {
    return val.substring('edupredict:student:'.length);
  }
  if (val.startsWith('student:')) {
    return val.substring('student:'.length);
  }
  if (val.includes(':')) {
    return val.split(':')[0];
  }
  return /^\d+$/.test(val) ? val : null;
}

function getStopDistance(stops: TripStop[], stopId: string): number {
  return stops.find((stop) => stop.id === stopId)?.distanceFromPreviousKm ?? 0;
}

function buildStopsList(rawStops: TripStop[], direction: 'morning' | 'evening'): TripStop[] {
  if (!rawStops || rawStops.length === 0) return [];
  
  // Clone raw stops so we don't mutate state directly
  let stopsCopy = rawStops.map(s => ({
    ...s,
    // Set ETA according to direction
    eta: direction === 'morning' ? (s.eta || '8:10 AM') : (s.dropTime || '4:30 PM'),
    students: s.students.map(st => ({
      ...st,
      status: 'qr_pending' as BoardingState,
    })),
  }));

  if (direction === 'evening') {
    stopsCopy.reverse();
  }

  // Prepend School (Start) and append School (End)
  const schoolStart: TripStop = {
    id: 'school-start',
    name: 'School',
    eta: direction === 'morning' ? '8:00 AM' : '4:00 PM',
    expectedStudents: 0,
    distanceFromPreviousKm: 0,
    latitude: 22.2940,
    longitude: 73.3600,
    arrivalRadiusMeters: 45,
    students: [],
  };

  const schoolEnd: TripStop = {
    id: 'school-end',
    name: 'School',
    eta: direction === 'morning' ? '8:30 AM' : '5:00 PM',
    expectedStudents: 0,
    distanceFromPreviousKm: 0,
    latitude: 22.2940,
    longitude: 73.3600,
    arrivalRadiusMeters: 45,
    students: [],
  };

  return [schoolStart, ...stopsCopy, schoolEnd];
}

function findStudentInStops(stops: TripStop[], studentId: string): StudentBoardingCandidate | null {
  for (const stop of stops) {
    const student = stop.students.find((item) => item.id === studentId);
    if (student) return { student, stop };
  }
  return null;
}

export const useTripStore = create<TripStore>((set, get) => ({
  ...initialState,

  initStore: async () => {
    try {
      const cached = await StorageService.getActiveTripState();
      if (cached) {
        set({
          tripStatus: cached.tripStatus || 'idle',
          routeName: cached.routeName || '',
          currentStopIndex: cached.currentStopIndex || 0,
          completedStopIds: cached.completedStopIds || [],
          stops: cached.stops || [],
          rawStops: cached.rawStops || [],
          selectedDirection: cached.selectedDirection || 'morning',
          tripSession: cached.tripSession || {
            direction: cached.selectedDirection || 'morning',
            status: cached.tripStatus === 'in_progress' ? 'running' : 'idle',
            currentStop: cached.stops?.[cached.currentStopIndex] || null,
            nextStop: cached.stops?.[cached.currentStopIndex + 1] || null,
            completedStops: cached.completedStopIds || [],
            studentsPicked: [],
            studentsDropped: [],
          },
          elapsedSeconds: cached.elapsedSeconds || 0,
          distanceCoveredKm: cached.distanceCoveredKm || 0,
          hasArrivedAtCurrent: cached.hasArrivedAtCurrent || false,
          tripId: cached.tripId || null,
          boardingQueue: cached.boardingQueue || [],
          activeTrip: {
            trip: cached.trip || null,
            currentStopIndex: cached.currentStopIndex || 0,
            isStarted: cached.tripStatus === 'in_progress',
          },
        });
        if (useLocationStore.getState().isOnline) {
          void get().syncOfflineBoardingQueue();
        }
      }
    } catch (err) {
      console.warn('Failed to restore active trip state:', err);
    }
  },

  loadTripDetails: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await getTripDetailsApi();
      if (res.success && res.data) {
        const { routeName, stops } = res.data;
        const mappedStops = (stops || []).map((s: any) => ({
          id: String(s.id),
          name: s.stopName,
          eta: s.pickupTime,
          dropTime: s.dropTime,
          expectedStudents: s.students?.length ?? 0,
          distanceFromPreviousKm: 0,
          latitude: s.latitude ?? 0,
          longitude: s.longitude ?? 0,
          arrivalRadiusMeters: 45,
          students: (s.students || []).map((student: any) => ({
            id: String(student.id),
            name: student.name,
            rollNumber: student.rollNumber || '',
            className: student.className || '',
            status: 'qr_pending' as BoardingState,
            parentName: student.parentName || 'Parent',
            parentPhone: student.parentPhone || '',
            pickupTime: student.pickupTime || s.pickupTime || '08:00 AM',
            dropTime: student.dropTime || s.dropTime || '04:30 PM',
          })),
        }));

        const direction = get().selectedDirection;
        const activeStops = buildStopsList(mappedStops, direction);

        set({
          routeName: routeName || 'No route assigned',
          rawStops: mappedStops,
          stops: activeStops,
          isLoading: false,
          tripSession: {
            direction,
            status: get().tripStatus === 'in_progress' ? 'running' : 'idle',
            currentStop: activeStops[0] || null,
            nextStop: activeStops[1] || null,
            completedStops: [],
            studentsPicked: [],
            studentsDropped: [],
          },
        });
      } else {
        set({ error: res.message || 'Failed to load trip details', isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Server error', isLoading: false });
    }
  },

  startTrip: async () => {
    const tripId = `trip-${Date.now()}`;
    const direction = get().selectedDirection;
    let rawStops = get().rawStops;

    if (!rawStops || rawStops.length === 0) {
      await get().loadTripDetails();
      rawStops = get().rawStops;
    }

    const activeStops = buildStopsList(rawStops, direction);

    set({
      tripStatus: 'in_progress',
      tripId,
      currentStopIndex: 0,
      completedStopIds: [],
      elapsedSeconds: 0,
      distanceCoveredKm: 0,
      hasArrivedAtCurrent: false,
      rawStops,
      stops: activeStops,
      activeTrip: {
        trip: null,
        currentStopIndex: 0,
        isStarted: true,
      },
      tripSession: {
        direction,
        status: 'running',
        currentStop: activeStops[0] || null,
        nextStop: activeStops[1] || null,
        completedStops: [],
        studentsPicked: [],
        studentsDropped: [],
      },
    });

    const state = get();
    await StorageService.saveActiveTripState({
      tripStatus: state.tripStatus,
      routeName: state.routeName,
      currentStopIndex: state.currentStopIndex,
      completedStopIds: state.completedStopIds,
      stops: state.stops,
      rawStops: state.rawStops,
      elapsedSeconds: state.elapsedSeconds,
      distanceCoveredKm: state.distanceCoveredKm,
      hasArrivedAtCurrent: state.hasArrivedAtCurrent,
      tripId: state.tripId,
      boardingQueue: state.boardingQueue,
      selectedDirection: state.selectedDirection,
      tripSession: state.tripSession,
    });
  },

  pauseTrip: () => {
    set({ tripStatus: 'paused' });
  },

  completeTrip: async () => {
    const nextDir = get().selectedDirection === 'morning' ? 'evening' : 'morning';
    set({
      tripStatus: 'idle',
      currentStopIndex: 0,
      completedStopIds: [],
      elapsedSeconds: 0,
      distanceCoveredKm: 0,
      hasArrivedAtCurrent: false,
      tripId: null,
      selectedDirection: nextDir,
      tripSession: {
        direction: nextDir,
        status: 'idle',
        currentStop: null,
        nextStop: null,
        completedStops: [],
        studentsPicked: [],
        studentsDropped: [],
      },
    });
    await StorageService.deleteActiveTripState();
  },

  resetTripEngine: () => {
    set(initialState);
  },

  markArrived: () => {
    const activeStops = get().stops;
    const idx = get().currentStopIndex;

    set({
      hasArrivedAtCurrent: true,
      tripSession: {
        ...get().tripSession,
        currentStop: activeStops[idx] || null,
        nextStop: activeStops[idx + 1] || null,
      },
    });

    const state = get();
    void StorageService.saveActiveTripState({
      tripStatus: state.tripStatus,
      routeName: state.routeName,
      currentStopIndex: state.currentStopIndex,
      completedStopIds: state.completedStopIds,
      stops: state.stops,
      rawStops: state.rawStops,
      elapsedSeconds: state.elapsedSeconds,
      distanceCoveredKm: state.distanceCoveredKm,
      hasArrivedAtCurrent: state.hasArrivedAtCurrent,
      tripId: state.tripId,
      boardingQueue: state.boardingQueue,
      selectedDirection: state.selectedDirection,
      tripSession: state.tripSession,
    });
  },

  skipStop: () => {
    const { stops, currentStopIndex, completedStopIds } = get();
    const currentStop = stops[currentStopIndex];
    if (!currentStop) return;

    const nextCompletedStops = completedStopIds.includes(currentStop.id)
      ? completedStopIds
      : [...completedStopIds, currentStop.id];
    const nextIndex = Math.min(currentStopIndex + 1, stops.length - 1);

    set({
      completedStopIds: nextCompletedStops,
      currentStopIndex: nextIndex,
      hasArrivedAtCurrent: false,
      tripSession: {
        ...get().tripSession,
        completedStops: nextCompletedStops,
        currentStop: stops[nextIndex] || null,
        nextStop: stops[nextIndex + 1] || null,
      },
    });

    const state = get();
    void StorageService.saveActiveTripState({
      tripStatus: state.tripStatus,
      routeName: state.routeName,
      currentStopIndex: state.currentStopIndex,
      completedStopIds: state.completedStopIds,
      stops: state.stops,
      rawStops: state.rawStops,
      elapsedSeconds: state.elapsedSeconds,
      distanceCoveredKm: state.distanceCoveredKm,
      hasArrivedAtCurrent: state.hasArrivedAtCurrent,
      tripId: state.tripId,
      boardingQueue: state.boardingQueue,
      selectedDirection: state.selectedDirection,
      tripSession: state.tripSession,
    });
  },

  nextStop: () => {
    const { stops, currentStopIndex, completedStopIds } = get();
    const currentStop = stops[currentStopIndex];
    const nextIndex = Math.min(currentStopIndex + 1, stops.length - 1);
    const alreadyCompleted = currentStop ? completedStopIds.includes(currentStop.id) : true;

    const nextCompletedStops = currentStop && !alreadyCompleted
      ? [...completedStopIds, currentStop.id]
      : completedStopIds;

    set({
      completedStopIds: nextCompletedStops,
      currentStopIndex: nextIndex,
      hasArrivedAtCurrent: false,
      activeTrip: { ...get().activeTrip, currentStopIndex: nextIndex },
      distanceCoveredKm:
        get().distanceCoveredKm +
        (currentStop && !alreadyCompleted ? getStopDistance(stops, currentStop.id) : 0),
      tripSession: {
        ...get().tripSession,
        completedStops: nextCompletedStops,
        currentStop: stops[nextIndex] || null,
        nextStop: stops[nextIndex + 1] || null,
      },
    });

    const state = get();
    void StorageService.saveActiveTripState({
      tripStatus: state.tripStatus,
      routeName: state.routeName,
      currentStopIndex: state.currentStopIndex,
      completedStopIds: state.completedStopIds,
      stops: state.stops,
      rawStops: state.rawStops,
      elapsedSeconds: state.elapsedSeconds,
      distanceCoveredKm: state.distanceCoveredKm,
      hasArrivedAtCurrent: state.hasArrivedAtCurrent,
      tripId: state.tripId,
      boardingQueue: state.boardingQueue,
      selectedDirection: state.selectedDirection,
      tripSession: state.tripSession,
    });
  },

  updateStudentStatus: async (studentId, status) => {
    set((state) => {
      const nextStops = state.stops.map((stop) => ({
        ...stop,
        students: stop.students.map((student) =>
          student.id === studentId
            ? {
                ...student,
                status,
                boardedAt: (status === 'boarded' || status === 'dropped')
                  ? student.boardedAt ?? new Date().toISOString()
                  : undefined,
              }
            : student
        ),
      }));

      let nextPicked = state.tripSession.studentsPicked.filter((id) => id !== studentId);
      let nextDropped = state.tripSession.studentsDropped.filter((id) => id !== studentId);

      if ((status === 'boarded' || status === 'present') && !nextPicked.includes(studentId)) {
        nextPicked.push(studentId);
      } else if (status === 'dropped' && !nextDropped.includes(studentId)) {
        nextDropped.push(studentId);
      }

      return {
        stops: nextStops,
        tripSession: {
          ...state.tripSession,
          studentsPicked: nextPicked,
          studentsDropped: nextDropped,
        },
      };
    });

    const state = get();
    await StorageService.saveActiveTripState({
      tripStatus: state.tripStatus,
      routeName: state.routeName,
      currentStopIndex: state.currentStopIndex,
      completedStopIds: state.completedStopIds,
      stops: state.stops,
      rawStops: state.rawStops,
      elapsedSeconds: state.elapsedSeconds,
      distanceCoveredKm: state.distanceCoveredKm,
      hasArrivedAtCurrent: state.hasArrivedAtCurrent,
      tripId: state.tripId,
      boardingQueue: state.boardingQueue,
      selectedDirection: state.selectedDirection,
      tripSession: state.tripSession,
    });

    const studentWithStop = findStudentInStops(state.stops, studentId);
    if (!studentWithStop) return;

    const auth = useAuthStore.getState();
    const bus = auth.driver?.assignedBus;

    const boardingPayload = {
      studentId: Number(studentId),
      busId: bus?.id,
      routeId: bus?.routeId,
      stopId: Number(studentWithStop.stop.id),
      tripId: state.tripId,
      status,
      direction: state.selectedDirection === 'morning' ? 'pickup' : 'dropoff',
    };

    const isOnline = useLocationStore.getState().isOnline;
    if (isOnline && bus) {
      try {
        await post('/mobile/driver/boarding', boardingPayload);
      } catch (err) {
        console.warn('Failed to sync boarding online, queuing:', err);
        set((s) => ({
          boardingQueue: [...s.boardingQueue, boardingPayload],
        }));
      }
    } else {
      set((s) => ({
        boardingQueue: [...s.boardingQueue, boardingPayload],
      }));
    }

    await StorageService.saveActiveTripState({
      tripStatus: get().tripStatus,
      routeName: get().routeName,
      currentStopIndex: get().currentStopIndex,
      completedStopIds: get().completedStopIds,
      stops: get().stops,
      rawStops: get().rawStops,
      elapsedSeconds: get().elapsedSeconds,
      distanceCoveredKm: get().distanceCoveredKm,
      hasArrivedAtCurrent: get().hasArrivedAtCurrent,
      tripId: get().tripId,
      boardingQueue: get().boardingQueue,
      selectedDirection: get().selectedDirection,
      tripSession: get().tripSession,
    });
  },

  boardStudent: async (studentId) => {
    const existing = findStudentInStops(get().stops, studentId);
    if (!existing) return null;

    const targetStatus = get().selectedDirection === 'morning' ? 'boarded' : 'dropped';
    await get().updateStudentStatus(studentId, targetStatus);

    const updatedStudent = findStudentInStops(get().stops, studentId);
    return updatedStudent;
  },

  undoBoard: async (studentId) => {
    await get().updateStudentStatus(studentId, 'qr_pending');
  },

  markAbsent: async (studentId) => {
    await get().updateStudentStatus(studentId, 'absent');
  },

  pendingQR: async (studentId) => {
    await get().updateStudentStatus(studentId, 'qr_pending');
  },

  findStudentByQRCode: async (qrValue) => {
    const normalized = normalizeQRValue(qrValue);
    const parsedId = parseStudentIdFromQR(normalized);

    // 1. Try local stop matching first
    for (const stop of get().stops) {
      const student = stop.students.find((item) => {
        const candidates = [
          item.id,
          item.rollNumber,
          `${item.id}:${item.rollNumber}`,
          `student:${item.id}`,
          `edupredict:student:${item.id}`,
        ].map(normalizeQRValue);
        return candidates.includes(normalized) || (parsedId && item.id === parsedId);
      });

      if (student) {
        const currentStop = get().stops[get().currentStopIndex];
        if (currentStop && stop.id !== currentStop.id) {
          return { student, stop, error: 'wrong_stop' } as StudentBoardingCandidate;
        }
        const targetStatus = get().selectedDirection === 'morning' ? 'boarded' : 'dropped';
        if (student.status === targetStatus) {
          return { student, stop, error: 'already_boarded' } as StudentBoardingCandidate;
        }
        return { student, stop } as StudentBoardingCandidate;
      }
    }

    // 2. Call backend /mobile/driver/scan-qr for server-side verification and authorization
    const isOnline = useLocationStore.getState().isOnline;
    if (isOnline) {
      try {
        const auth = useAuthStore.getState();
        const driverBus = auth.driver?.assignedBus;
        const state = get();

        const scanRes = await post<any>('/mobile/driver/scan-qr', {
          qrToken: qrValue.trim(),
          busId: driverBus?.id,
          routeId: driverBus?.routeId,
          tripId: state.tripId || 'LIVE-TRIP-1',
          direction: state.selectedDirection === 'morning' ? 'pickup' : 'dropoff',
        });

        if (scanRes.success && scanRes.data) {
          const sData = scanRes.data;
          const matchedStudentInStops = findStudentInStops(state.stops, String(sData.studentId));

          if (matchedStudentInStops) {
            if (scanRes.alreadyBoarded) {
              return {
                ...matchedStudentInStops,
                error: 'already_boarded',
              } as StudentBoardingCandidate;
            }
            return matchedStudentInStops as StudentBoardingCandidate;
          }

          // Matched student verified on backend
          return {
            student: {
              id: String(sData.studentId),
              name: sData.studentName,
              rollNumber: sData.rollNumber || '',
              className: '',
              status: scanRes.alreadyBoarded ? 'boarded' : 'qr_pending',
            },
            stop: { id: '1', name: 'Assigned Stop' },
            error: scanRes.alreadyBoarded ? 'already_boarded' : undefined,
          } as any;
        } else if (scanRes.message && scanRes.message.includes('not assigned to this bus')) {
          return {
            student: {
              id: 'unknown',
              name: 'Student',
              rollNumber: '',
              className: '',
              status: 'qr_pending',
            },
            stop: { id: '0', name: 'Other Route' },
            error: 'wrong_bus',
          } as any;
        }
      } catch (err) {
        console.warn('Online backend QR verification failed:', err);
      }
    }

    return null;
  },

  syncOfflineBoardingQueue: async () => {
    const { boardingQueue } = get();
    if (boardingQueue.length === 0) return;

    const isOnline = useLocationStore.getState().isOnline;
    if (!isOnline) return;

    const remaining = [...boardingQueue];
    const syncedIds: string[] = [];

    for (const item of remaining) {
      try {
        await post('/mobile/driver/boarding', item);
        syncedIds.push(String(item.studentId));
      } catch (err) {
        console.warn('Failed to sync queued boarding item:', err);
        break;
      }
    }

    const nextQueue = boardingQueue.filter((item) => !syncedIds.includes(String(item.studentId)));
    set({ boardingQueue: nextQueue });

    const state = get();
    await StorageService.saveActiveTripState({
      tripStatus: state.tripStatus,
      routeName: state.routeName,
      currentStopIndex: state.currentStopIndex,
      completedStopIds: state.completedStopIds,
      stops: state.stops,
      rawStops: state.rawStops,
      elapsedSeconds: state.elapsedSeconds,
      distanceCoveredKm: state.distanceCoveredKm,
      hasArrivedAtCurrent: state.hasArrivedAtCurrent,
      tripId: state.tripId,
      boardingQueue: nextQueue,
      selectedDirection: state.selectedDirection,
      tripSession: state.tripSession,
    });
  },

  tick: () => {
    set((state) => {
      const nextSeconds = state.tripStatus === 'in_progress' ? state.elapsedSeconds + 1 : state.elapsedSeconds;

      if (nextSeconds > 0 && nextSeconds % 10 === 0 && state.tripStatus === 'in_progress') {
        void StorageService.saveActiveTripState({
          tripStatus: state.tripStatus,
          routeName: state.routeName,
          currentStopIndex: state.currentStopIndex,
          completedStopIds: state.completedStopIds,
          stops: state.stops,
          rawStops: state.rawStops,
          elapsedSeconds: nextSeconds,
          distanceCoveredKm: state.distanceCoveredKm,
          hasArrivedAtCurrent: state.hasArrivedAtCurrent,
          tripId: state.tripId,
          boardingQueue: state.boardingQueue,
          selectedDirection: state.selectedDirection,
          tripSession: state.tripSession,
        });
      }

      return { elapsedSeconds: nextSeconds };
    });
  },

  getSummary: () => {
    const state = get();
    const isMorning = state.selectedDirection === 'morning';
    const pickedCount = state.stops
      .flatMap((stop) => stop.students)
      .filter((student) => student.status === (isMorning ? 'boarded' : 'dropped')).length;

    return {
      studentsPicked: pickedCount,
      stopsCovered: state.completedStopIds.length,
      distanceCoveredKm: state.distanceCoveredKm,
      durationSeconds: state.elapsedSeconds,
    };
  },

  setDirection: (direction) => {
    const rawStops = get().rawStops;
    const activeStops = buildStopsList(rawStops, direction);
    set({
      selectedDirection: direction,
      stops: activeStops,
      currentStopIndex: 0,
      completedStopIds: [],
      hasArrivedAtCurrent: false,
      tripSession: {
        direction,
        status: get().tripStatus === 'in_progress' ? 'running' : 'idle',
        currentStop: activeStops[0] || null,
        nextStop: activeStops[1] || null,
        completedStops: [],
        studentsPicked: [],
        studentsDropped: [],
      },
    });
  },

  setActiveTrip: (trip) => set((state) => ({ activeTrip: { ...state.activeTrip, trip } })),
  setCurrentStop: (currentStopIndex) =>
    set((state) => ({
      currentStopIndex,
      activeTrip: { ...state.activeTrip, currentStopIndex },
    })),
  setTripStarted: (isStarted) =>
    set((state) => ({
      tripStatus: isStarted ? 'in_progress' : 'idle',
      activeTrip: { ...state.activeTrip, isStarted },
    })),
  setHistory: (history) => set({ history }),
  setUpcomingTrips: (upcomingTrips) => set({ upcomingTrips }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
