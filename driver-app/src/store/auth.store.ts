import { create } from 'zustand';
import { Platform } from 'react-native';
import { patch, post, del } from '@/api/client';
import { loginApi, validateSessionApi } from '@/api/auth';
import { queryClient } from '@/lib/query-client';
import { StorageService } from '@/services/storage.service';
import { useDriverStore } from '@/store/driver.store';
import { useStudentStore } from '@/store/student.store';
import { useTripStore } from '@/store/trip.store';
import {
  AuthStatus,
  DriverProfile,
  LoginCredentials,
  LoginResponse,
} from '@/types/auth.types';
import { ApiError } from '@/types/api.types';
import { getAuthErrorMessage } from '@/utils/auth-errors';

interface AuthState {
  driver: DriverProfile | null;
  token: string | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  rememberMe: boolean;

  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  clearError: () => void;
  applySession: (response: LoginResponse, rememberMe: boolean) => Promise<void>;
  updateDriverProfile: (
    partial: Partial<Omit<DriverProfile, 'assignedBus'>> & {
      assignedBus?: Partial<NonNullable<DriverProfile['assignedBus']>>;
    }
  ) => Promise<void>;
  uploadDriverPhoto: (uri: string) => Promise<void>;
  removeDriverPhoto: () => Promise<void>;
}

const initialState = {
  driver: null as DriverProfile | null,
  token: null as string | null,
  status: 'idle' as AuthStatus,
  isAuthenticated: false,
  loading: false,
  error: null as string | null,
  rememberMe: false,
};

function mapLoginResponse(response: LoginResponse): DriverProfile {
  return {
    id: response.driver.id,
    name: response.driver.name,
    phone: response.driver.phone,
    email: response.driver.email,
    photoUrl: response.driver.photoUrl,
    role: response.role,
    assignedBus: response.assignedBus,
    assignedRoute: response.assignedRoute,
    permissions: response.permissions,
  };
}

function isUnauthorizedRole(response: LoginResponse): boolean {
  return response.role.toLowerCase() !== 'driver';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...initialState,

  updateDriverProfile: async (partial) => {
    const current = get().driver;
    if (!current) return;

    const updated: DriverProfile = {
      ...current,
      ...partial,
      assignedBus: current.assignedBus
        ? { ...current.assignedBus, ...partial.assignedBus }
        : partial.assignedBus
        ? ({
            id: 'bus-1',
            busNumber: 'Not Available',
            registrationNumber: 'Not Available',
            capacity: 0,
            nickname: partial.assignedBus.nickname || 'Not Available',
          } as any)
        : null,
    };

    set({ driver: updated });

    // Persist to database via API
    try {
      await patch('/mobile/driver/profile', {
        name: partial.name,
        phone: partial.phone,
        photoUrl: partial.photoUrl,
        vehicleNickname: partial.assignedBus?.nickname,
      });
    } catch (err) {
      console.warn('[auth.store] Network profile update failed, using local sync:', err);
    }

    await StorageService.setDriverData(updated);
    if (partial.name) await StorageService.setDriverName(partial.name);
    if (partial.phone) await StorageService.setDriverPhone(partial.phone);
    if (partial.photoUrl !== undefined) await StorageService.setCustomAvatarUri(partial.photoUrl || null);
    if (partial.assignedBus?.nickname !== undefined) await StorageService.setVehicleNickname(partial.assignedBus.nickname || '');
  },

  uploadDriverPhoto: async (uri: string) => {
    const current = get().driver;
    if (!current) return;

    const formData = new FormData();
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      const fileExt = uri.includes('png') ? 'png' : uri.includes('webp') ? 'webp' : 'jpg';
      formData.append('image', blob, `profile.${fileExt}`);
    } else {
      const filename = uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append('image', {
        uri,
        name: filename,
        type,
      } as any);
    }

    const response = await post<{ data: DriverProfile; profileImageUrl: string }>(
      '/mobile/driver/profile/photo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    if (response.data) {
      const updated = response.data.data || {
        ...current,
        photoUrl: response.data.profileImageUrl,
      };
      set({ driver: updated });
      await StorageService.setDriverData(updated);
      await StorageService.setDriverPhoto(updated.photoUrl || '');
    }
  },

  removeDriverPhoto: async () => {
    const current = get().driver;
    if (!current) return;

    const response = await del<{ data: DriverProfile }>('/mobile/driver/profile/photo');
    const updated = response.data?.data || { ...current, photoUrl: null };
    set({ driver: updated });
    await StorageService.setDriverData(updated);
    await StorageService.setDriverPhoto('');
  },

  clearError: () => set({ error: null }),

  applySession: async (response, rememberMe) => {
    if (isUnauthorizedRole(response)) {
      throw {
        code: 'UNAUTHORIZED_ROLE',
        message: 'This account is not authorized for Driver App.',
        statusCode: 403,
      } satisfies ApiError;
    }

    const driver = mapLoginResponse(response);

    await StorageService.saveSession({
      token: response.token,
      role: response.role,
      driver,
      rememberMe,
    });

    if (rememberMe) {
      await StorageService.setSavedMobile(driver.phone);
    } else {
      await StorageService.deleteSavedMobile();
    }

    set({
      driver,
      token: response.token,
      isAuthenticated: true,
      status: 'authenticated',
      loading: false,
      error: null,
      rememberMe,
    });
  },

  login: async (credentials) => {
    set({ loading: true, error: null, status: 'loading' });

    try {
      const result = await loginApi(credentials);

      if (!result.success || !result.data) {
        throw {
          code: 'LOGIN_FAILED',
          message: result.message || 'Login failed.',
          statusCode: 400,
        } satisfies ApiError;
      }

      await get().applySession(result.data, credentials.rememberMe ?? false);
    } catch (error) {
      const apiError = error as ApiError;
      const message = getAuthErrorMessage(apiError);
      const isNetworkError =
        apiError.statusCode === 0 || apiError.code === 'NETWORK_ERROR';
      set({
        loading: false,
        // Network errors keep 'unauthenticated' so the user stays on login
        // and can retry without NavigationGuard flashing
        status: isNetworkError ? 'unauthenticated' : 'error',
        isAuthenticated: false,
        error: message,
      });
      throw new Error(message);
    }
  },

  restoreSession: async () => {
    set({ loading: true, status: 'loading', error: null });

    try {
      const [token, cachedDriver, rememberMe] = await Promise.all([
        StorageService.getAccessToken(),
        StorageService.getDriverData(),
        StorageService.getRememberMe(),
      ]);

      if (!token) {
        set({
          ...initialState,
          status: 'unauthenticated',
          loading: false,
          rememberMe,
        });
        return false;
      }

      if (cachedDriver) {
        set({
          driver: cachedDriver,
          token,
          isAuthenticated: true,
          status: 'loading',
          loading: true,
          rememberMe,
        });
      }

      try {
        const result = await validateSessionApi();

        if (!result.success || !result.data) {
          // Server responded but session is invalid → clear it
          await StorageService.clearSession();
          set({
            ...initialState,
            status: 'unauthenticated',
            loading: false,
            rememberMe,
          });
          return false;
        }

        await get().applySession(result.data, rememberMe);
        return true;
      } catch (validationError) {
        const apiErr = validationError as ApiError;
        const isNetworkError =
          apiErr.statusCode === 0 || apiErr.code === 'NETWORK_ERROR';

        if (isNetworkError && cachedDriver && token) {
          // Backend unreachable but we have valid cached data → use it
          set({
            driver: cachedDriver,
            token,
            isAuthenticated: true,
            status: 'authenticated',
            loading: false,
            error: null,
            rememberMe,
          });
          return true;
        }

        // Genuine auth error (401, 403, etc.) → clear session
        await StorageService.clearSession();
        set({
          ...initialState,
          status: 'unauthenticated',
          loading: false,
          rememberMe,
        });
        return false;
      }
    } catch {
      // Storage read itself failed — rare edge case
      const rememberMe = await StorageService.getRememberMe().catch(() => false);
      set({
        ...initialState,
        status: 'unauthenticated',
        loading: false,
        rememberMe,
        driver: null,
      });
      return false;
    }
  },

  logout: async () => {
    const rememberMe = await StorageService.getRememberMe();
    await StorageService.clearSession();
    queryClient.clear();
    useDriverStore.getState().reset();
    useStudentStore.getState().reset();
    useTripStore.getState().reset();
    set({
      ...initialState,
      status: 'unauthenticated',
      rememberMe,
    });
  },
}));
