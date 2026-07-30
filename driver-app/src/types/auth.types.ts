export interface DriverPermissions {
  canStartTrip: boolean;
  canMarkAttendance: boolean;
  canViewStudents: boolean;
  canReportIncident: boolean;
}

export interface AssignedBus {
  id: number;
  busNumber: string;
  registrationNumber: string;
  routeName: string | null;
  routeId: number | null;
  capacity: number | null;
  nickname: string | null;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  photoUrl: string | null;
  role: string;
  assignedBus: AssignedBus | null;
  assignedRoute: string | null;
  permissions: DriverPermissions;
}

export interface LoginCredentials {
  mobileNumber: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  role: string;
  driver: Pick<DriverProfile, 'id' | 'name' | 'phone' | 'email' | 'photoUrl'>;
  assignedBus: AssignedBus | null;
  assignedRoute: string | null;
  permissions: DriverPermissions;
}

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface StoredDriverSession {
  token: string;
  role: string;
  driver: DriverProfile;
  rememberMe: boolean;
}
