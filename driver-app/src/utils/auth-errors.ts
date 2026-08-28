import { ApiError } from '@/types/api.types';

export function getAuthErrorMessage(error: ApiError): string {
  if (error.statusCode === 0) {
    return 'Unable to connect. Check your internet connection.';
  }

  if (error.code === 'UNAUTHORIZED_ROLE') {
    return 'This account is not authorized for Driver App.';
  }

  if (error.statusCode === 401) {
    if (error.code === 'TOKEN_EXPIRED') {
      return 'Session expired. Please log in again.';
    }
    return error.message || 'Invalid mobile number or password.';
  }

  if (error.statusCode === 403) {
    return 'This account is not authorized for Driver App.';
  }

  if (error.statusCode >= 500) {
    return 'Server unavailable. Please try again later.';
  }

  return error.message || 'Something went wrong. Please try again.';
}
