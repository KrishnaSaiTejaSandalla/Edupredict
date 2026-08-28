import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { DriverProfile, StoredDriverSession } from '@/types/auth.types';

const KEYS = {
  ACCESS_TOKEN: 'edupredict_access_token',
  DRIVER_ID: 'edupredict_driver_id',
  DRIVER_NAME: 'edupredict_driver_name',
  DRIVER_PHONE: 'edupredict_driver_phone',
  DRIVER_PHOTO: 'edupredict_driver_photo',
  BUS_NUMBER: 'edupredict_bus_number',
  ASSIGNED_ROUTE: 'edupredict_assigned_route',
  REMEMBER_ME: 'edupredict_remember_me',
  SAVED_MOBILE: 'edupredict_saved_mobile',
  DRIVER_DATA: 'edupredict_driver_data',
  APP_THEME: 'edupredict_app_theme',
  APP_LANGUAGE: 'edupredict_app_language',
  DRIVER_PHOTO_URI: 'edupredict_driver_photo_uri',
  VEHICLE_NICKNAME: 'edupredict_vehicle_nickname',
  PERMISSION_ONBOARDING_COMPLETED: 'edupredict_perm_onboarding_completed',
  PERM_LOCATION: 'edupredict_perm_location',
  PERM_CAMERA: 'edupredict_perm_camera',
  PERM_GALLERY: 'edupredict_perm_gallery',
  PERM_NOTIFICATIONS: 'edupredict_perm_notifications',
  PERM_BGSYNC: 'edupredict_perm_bgsync',
} as const;

type StorageKey = (typeof KEYS)[keyof typeof KEYS];

async function setItem(key: StorageKey, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage setItem failed:', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: StorageKey): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage getItem failed:', e);
      return null;
    }
  } else {
    return SecureStore.getItemAsync(key);
  }
}

async function deleteItem(key: StorageKey): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage deleteItem failed:', e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

function buildDriverProfile(session: StoredDriverSession): DriverProfile {
  return session.driver;
}

export const StorageService = {
  setAccessToken: (token: string) => setItem(KEYS.ACCESS_TOKEN, token),
  getAccessToken: () => getItem(KEYS.ACCESS_TOKEN),
  deleteAccessToken: () => deleteItem(KEYS.ACCESS_TOKEN),

  setRememberMe: (value: boolean) => setItem(KEYS.REMEMBER_ME, String(value)),
  getRememberMe: async (): Promise<boolean> => {
    const val = await getItem(KEYS.REMEMBER_ME);
    return val === 'true';
  },

  setSavedMobile: (mobile: string) => setItem(KEYS.SAVED_MOBILE, mobile),
  getSavedMobile: () => getItem(KEYS.SAVED_MOBILE),
  deleteSavedMobile: () => deleteItem(KEYS.SAVED_MOBILE),

  setDriverId: (id: string) => setItem(KEYS.DRIVER_ID, id),
  getDriverId: () => getItem(KEYS.DRIVER_ID),
  deleteDriverId: () => deleteItem(KEYS.DRIVER_ID),

  setDriverName: (name: string) => setItem(KEYS.DRIVER_NAME, name),
  getDriverName: () => getItem(KEYS.DRIVER_NAME),
  deleteDriverName: () => deleteItem(KEYS.DRIVER_NAME),

  setDriverPhone: (phone: string) => setItem(KEYS.DRIVER_PHONE, phone),
  getDriverPhone: () => getItem(KEYS.DRIVER_PHONE),
  deleteDriverPhone: () => deleteItem(KEYS.DRIVER_PHONE),

  setDriverPhoto: (photoUrl: string) => setItem(KEYS.DRIVER_PHOTO, photoUrl),
  getDriverPhoto: () => getItem(KEYS.DRIVER_PHOTO),
  deleteDriverPhoto: () => deleteItem(KEYS.DRIVER_PHOTO),

  setBusNumber: (busNumber: string) => setItem(KEYS.BUS_NUMBER, busNumber),
  getBusNumber: () => getItem(KEYS.BUS_NUMBER),
  deleteBusNumber: () => deleteItem(KEYS.BUS_NUMBER),

  setAssignedRoute: (route: string) => setItem(KEYS.ASSIGNED_ROUTE, route),
  getAssignedRoute: () => getItem(KEYS.ASSIGNED_ROUTE),
  deleteAssignedRoute: () => deleteItem(KEYS.ASSIGNED_ROUTE),

  setDriverData: async (driver: DriverProfile): Promise<void> => {
    await setItem(KEYS.DRIVER_DATA, JSON.stringify(driver));
  },
  getDriverData: async (): Promise<DriverProfile | null> => {
    const raw = await getItem(KEYS.DRIVER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DriverProfile;
    } catch {
      return null;
    }
  },
  deleteDriverData: () => deleteItem(KEYS.DRIVER_DATA),

  saveSession: async (session: StoredDriverSession): Promise<void> => {
    const driver = buildDriverProfile(session);
    await Promise.all([
      StorageService.setAccessToken(session.token),
      StorageService.setDriverId(driver.id),
      StorageService.setDriverName(driver.name),
      StorageService.setDriverPhone(driver.phone),
      StorageService.setDriverPhoto(driver.photoUrl ?? ''),
      StorageService.setBusNumber(driver.assignedBus?.busNumber ?? ''),
      StorageService.setAssignedRoute(driver.assignedRoute ?? ''),
      StorageService.setRememberMe(session.rememberMe),
      StorageService.setDriverData(driver),
    ]);
  },

  clearSession: async (): Promise<void> => {
    const rememberMe = await StorageService.getRememberMe();
    const savedMobile = rememberMe ? await StorageService.getSavedMobile() : null;

    await Promise.all([
      deleteItem(KEYS.ACCESS_TOKEN),
      deleteItem(KEYS.DRIVER_ID),
      deleteItem(KEYS.DRIVER_NAME),
      deleteItem(KEYS.DRIVER_PHONE),
      deleteItem(KEYS.DRIVER_PHOTO),
      deleteItem(KEYS.BUS_NUMBER),
      deleteItem(KEYS.ASSIGNED_ROUTE),
      deleteItem(KEYS.DRIVER_DATA),
    ]);

    if (!rememberMe) {
      await deleteItem(KEYS.REMEMBER_ME);
      await deleteItem(KEYS.SAVED_MOBILE);
    } else if (savedMobile) {
      await setItem(KEYS.SAVED_MOBILE, savedMobile);
      await setItem(KEYS.REMEMBER_ME, 'true');
    }
  },

  clearAll: async (): Promise<void> => {
    await Promise.all(Object.values(KEYS).map((key) => deleteItem(key)));
  },

  saveActiveTripState: async (state: any): Promise<void> => {
    await setItem('edupredict_active_trip_state' as any, JSON.stringify(state));
  },
  getActiveTripState: async (): Promise<any | null> => {
    const raw = await getItem('edupredict_active_trip_state' as any);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  deleteActiveTripState: async (): Promise<void> => {
    await deleteItem('edupredict_active_trip_state' as any);
  },

  setTheme: (themeMode: 'dark' | 'light') => setItem(KEYS.APP_THEME, themeMode),
  getTheme: async (): Promise<'dark' | 'light' | null> => {
    const val = await getItem(KEYS.APP_THEME);
    if (val === 'dark' || val === 'light') return val;
    return null;
  },

  setLanguage: (lang: 'en' | 'hi' | 'te') => setItem(KEYS.APP_LANGUAGE, lang),
  getLanguage: async (): Promise<'en' | 'hi' | 'te' | null> => {
    const val = await getItem(KEYS.APP_LANGUAGE);
    if (val === 'en' || val === 'hi' || val === 'te') return val;
    return null;
  },

  setCustomAvatarUri: (uri: string | null) => (uri ? setItem(KEYS.DRIVER_PHOTO_URI, uri) : deleteItem(KEYS.DRIVER_PHOTO_URI)),
  getCustomAvatarUri: () => getItem(KEYS.DRIVER_PHOTO_URI),

  setVehicleNickname: (nickname: string) => setItem(KEYS.VEHICLE_NICKNAME, nickname),
  getVehicleNickname: () => getItem(KEYS.VEHICLE_NICKNAME),

  setPermissionOnboardingCompleted: (completed: boolean) =>
    completed
      ? setItem(KEYS.PERMISSION_ONBOARDING_COMPLETED, 'true')
      : deleteItem(KEYS.PERMISSION_ONBOARDING_COMPLETED),
  getPermissionOnboardingCompleted: async (): Promise<boolean> => {
    const val = await getItem(KEYS.PERMISSION_ONBOARDING_COMPLETED);
    return val === 'true';
  },

  setPermissionState: async (
    key: 'location' | 'camera' | 'gallery' | 'notifications' | 'bgsync',
    value: boolean
  ): Promise<void> => {
    const storageKey =
      key === 'location'
        ? KEYS.PERM_LOCATION
        : key === 'camera'
        ? KEYS.PERM_CAMERA
        : key === 'gallery'
        ? KEYS.PERM_GALLERY
        : key === 'notifications'
        ? KEYS.PERM_NOTIFICATIONS
        : KEYS.PERM_BGSYNC;
    await setItem(storageKey, String(value));
  },
  getPermissionState: async (
    key: 'location' | 'camera' | 'gallery' | 'notifications' | 'bgsync'
  ): Promise<boolean | null> => {
    const storageKey =
      key === 'location'
        ? KEYS.PERM_LOCATION
        : key === 'camera'
        ? KEYS.PERM_CAMERA
        : key === 'gallery'
        ? KEYS.PERM_GALLERY
        : key === 'notifications'
        ? KEYS.PERM_NOTIFICATIONS
        : KEYS.PERM_BGSYNC;
    const val = await getItem(storageKey);
    if (val === null || val === undefined) return null;
    return val === 'true';
  },
} as const;
