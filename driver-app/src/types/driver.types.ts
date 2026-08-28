export interface DriverProfile {
  id: string;
  driverId: string;
  name: string;
  phone: string;
  email: string;
  avatarUrl?: string;
  licenseNumber: string;
  licenseExpiry: string; // ISO date
  experience: number; // years
  rating: number; // 1-5
  totalTrips: number;
  status: DriverStatus;
  assignedBus?: AssignedBus;
}

export type DriverStatus = 'active' | 'inactive' | 'on_trip' | 'off_duty';

export interface AssignedBus {
  id: string;
  busNumber: string;
  registrationNumber: string;
  capacity: number;
  model: string;
  year: number;
}

export interface DriverStats {
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalDistance: number; // km
  avgRating: number;
  studentsServed: number;
}
