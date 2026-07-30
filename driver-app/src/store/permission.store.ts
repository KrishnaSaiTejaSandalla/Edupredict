import { create } from 'zustand';
import { StorageService } from '@/services/storage.service';

interface PermissionState {
  locationGranted: boolean;
  cameraGranted: boolean;
  galleryGranted: boolean;
  notificationsGranted: boolean;
  backgroundSyncGranted: boolean;

  setLocationGranted: (granted: boolean) => void;
  setCameraGranted: (granted: boolean) => void;
  setGalleryGranted: (granted: boolean) => void;
  setNotificationsGranted: (granted: boolean) => void;
  setBackgroundSyncGranted: (granted: boolean) => void;
  loadPermissions: () => Promise<void>;
  syncPermissions: () => Promise<void>;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  locationGranted: true,
  cameraGranted: true,
  galleryGranted: true,
  notificationsGranted: true,
  backgroundSyncGranted: true,

  setLocationGranted: (granted) => {
    set({ locationGranted: granted });
    StorageService.setPermissionState('location', granted);
  },
  setCameraGranted: (granted) => {
    set({ cameraGranted: granted });
    StorageService.setPermissionState('camera', granted);
  },
  setGalleryGranted: (granted) => {
    set({ galleryGranted: granted });
    StorageService.setPermissionState('gallery', granted);
  },
  setNotificationsGranted: (granted) => {
    set({ notificationsGranted: granted });
    StorageService.setPermissionState('notifications', granted);
  },
  setBackgroundSyncGranted: (granted) => {
    set({ backgroundSyncGranted: granted });
    StorageService.setPermissionState('bgsync', granted);
  },

  loadPermissions: async () => {
    const [loc, cam, gal, notif, bg] = await Promise.all([
      StorageService.getPermissionState('location'),
      StorageService.getPermissionState('camera'),
      StorageService.getPermissionState('gallery'),
      StorageService.getPermissionState('notifications'),
      StorageService.getPermissionState('bgsync'),
    ]);

    set({
      locationGranted: loc ?? true,
      cameraGranted: cam ?? true,
      galleryGranted: gal ?? true,
      notificationsGranted: notif ?? true,
      backgroundSyncGranted: bg ?? true,
    });
  },

  syncPermissions: async () => {
    await get().loadPermissions();
  },
}));
