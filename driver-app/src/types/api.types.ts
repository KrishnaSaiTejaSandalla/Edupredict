export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  statusCode: number;
}

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
}
