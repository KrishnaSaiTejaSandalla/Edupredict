import { create } from 'zustand';
import { DriverProfile, DriverStats, DriverStatus } from '@/types/driver.types';

interface DriverState {
  // State
  profile: DriverProfile | null;
  stats: DriverStats | null;
  status: DriverStatus | null;
  isLoading: boolean;
  error: string | null;

  // Actions (placeholder)
  setProfile: (profile: DriverProfile | null) => void;
  setStats: (stats: DriverStats | null) => void;
  setStatus: (status: DriverStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  profile:   null,
  stats:     null,
  status:    null,
  isLoading: false,
  error:     null,
};

export const useDriverStore = create<DriverState>((set) => ({
  ...initialState,

  setProfile:  (profile)   => set({ profile }),
  setStats:    (stats)     => set({ stats }),
  setStatus:   (status)    => set({ status }),
  setLoading:  (isLoading) => set({ isLoading }),
  setError:    (error)     => set({ error }),
  reset:       ()          => set(initialState),
}));
