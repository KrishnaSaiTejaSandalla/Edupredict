import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { ENV } from '@/config/env';
import { ApiResponse, ApiError } from '@/types/api.types';
import { StorageService } from '@/services/storage.service';
import { triggerUnauthorized } from '@/lib/auth-events';

const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: ENV.TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-App-Version': ENV.APP_VERSION,
    'X-Platform': 'driver-app',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await StorageService.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
      skipAuthHandler?: boolean;
    };
    const status = error.response?.status;

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      await StorageService.clearSession();

      if (!originalRequest.skipAuthHandler) {
        triggerUnauthorized();
      }
    }

    return Promise.reject(normalizeError(error));
  },
);

function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Partial<ApiError & { message?: string; code?: string }> | undefined;

    if (!error.response) {
      // Timeout errors get a specific code
      if (error.code === 'ECONNABORTED') {
        return {
          code: 'TIMEOUT_ERROR',
          message: 'Request timed out. Please try again.',
          statusCode: 0,
        };
      }
      return {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Check your internet connection.',
        statusCode: 0,
      };
    }

    return {
      code: data?.code ?? 'UNKNOWN_ERROR',
      message: data?.message ?? error.message ?? 'An unexpected error occurred',
      details: data?.details,
      statusCode: error.response.status ?? 0,
    };
  }

  // Non-Axios errors (e.g. CORS failures surface as TypeError in browsers)
  if (error instanceof TypeError && error.message?.includes('Network')) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Unable to connect to the server. Check your internet connection.',
      statusCode: 0,
    };
  }

  return {
    code: 'CLIENT_ERROR',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    statusCode: 0,
  };
}

/** Check whether an ApiError represents a network/connectivity failure */
export function isNetworkError(error: unknown): boolean {
  const apiError = error as ApiError | undefined;
  if (!apiError) return false;
  return (
    apiError.statusCode === 0 ||
    apiError.code === 'NETWORK_ERROR' ||
    apiError.code === 'TIMEOUT_ERROR'
  );
}

export async function get<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const res = await apiClient.get<ApiResponse<T>>(url, config);
  return res.data;
}

export async function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const res = await apiClient.post<ApiResponse<T>>(url, data, config);
  return res.data;
}

export async function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const res = await apiClient.put<ApiResponse<T>>(url, data, config);
  return res.data;
}

export async function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const res = await apiClient.patch<ApiResponse<T>>(url, data, config);
  return res.data;
}

export async function del<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  const res = await apiClient.delete<ApiResponse<T>>(url, config);
  return res.data;
}

export { apiClient, normalizeError };
