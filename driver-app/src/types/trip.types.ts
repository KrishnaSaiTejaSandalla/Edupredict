import { Stop } from './student.types';

export type TripStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type TripDirection = 'pickup' | 'dropoff';

export interface Trip {
  id: string;
  date: string; // ISO date
  direction: TripDirection;
  status: TripStatus;
  driverId: string;
  busId: string;
  routeId: string;
  routeName: string;
  startTime?: string; // ISO datetime
  endTime?: string; // ISO datetime
  stops: Stop[];
  totalStudents: number;
  boardedStudents: number;
  completedStops: number;
}

export interface TripHistory {
  id: string;
  date: string;
  direction: TripDirection;
  status: TripStatus;
  routeName: string;
  duration: number; // minutes
  distance: number; // km
  studentsCount: number;
}

export interface ActiveTripState {
  trip: Trip | null;
  currentStopIndex: number;
  isStarted: boolean;
}
