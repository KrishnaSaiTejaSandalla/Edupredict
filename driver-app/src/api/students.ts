// ============================================================
// Students API — Placeholder functions
// ============================================================

import { Student, StudentAttendance } from '@/types/student.types';
import { ApiResponse, PaginatedResponse, PaginationParams } from '@/types/api.types';
import { get, post } from './client';

// GET /students — list for driver's active trip
export async function getStudentsApi(
  tripId: string,
  params?: PaginationParams,
): Promise<ApiResponse<PaginatedResponse<Student>>> {
  return get<PaginatedResponse<Student>>(`/trips/${tripId}/students`, { params });
}

// GET /students/:id
export async function getStudentApi(
  studentId: string,
): Promise<ApiResponse<Student>> {
  return get<Student>(`/students/${studentId}`);
}

// POST /students/:id/attendance
export async function markAttendanceApi(
  studentId: string,
  data: Pick<StudentAttendance, 'status'>,
): Promise<ApiResponse<StudentAttendance>> {
  return post<StudentAttendance>(`/students/${studentId}/attendance`, data);
}
