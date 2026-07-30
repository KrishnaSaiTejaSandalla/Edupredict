export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  section: string;
  avatarUrl?: string;
  phone?: string;
  parentName: string;
  parentPhone: string;
  address: string;
  stopId: string;
  stopName: string;
  boardingStatus: BoardingStatus;
}

export type BoardingStatus = 'pending' | 'boarded' | 'dropped' | 'absent';

export interface Stop {
  id: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
  estimatedTime: string; // HH:mm
  studentsCount: number;
}

export interface StudentAttendance {
  studentId: string;
  date: string; // ISO date
  status: 'present' | 'absent' | 'late';
  boardedAt?: string; // ISO datetime
  droppedAt?: string; // ISO datetime
}
