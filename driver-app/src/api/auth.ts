import { LoginCredentials, LoginResponse } from '@/types/auth.types';
import { ApiResponse } from '@/types/api.types';
import { AxiosRequestConfig } from 'axios';
import { get, post } from './client';

export async function loginApi(
  credentials: LoginCredentials,
): Promise<ApiResponse<LoginResponse>> {
  return post<LoginResponse>(
    '/mobile/driver/login',
    {
      mobileNumber: credentials.mobileNumber,
      password: credentials.password,
    },
    { skipAuthHandler: true } as AxiosRequestConfig,
  );
}

export async function validateSessionApi(): Promise<ApiResponse<LoginResponse>> {
  return get<LoginResponse>('/mobile/driver/session', {
    skipAuthHandler: true,
  } as AxiosRequestConfig);
}
