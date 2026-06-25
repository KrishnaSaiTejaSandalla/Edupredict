import { create } from 'zustand';

type NotificationState = {
  unreadCount: number;
  hydrate: (count: number) => void;
  decrement: (n?: number) => void;
  increment: (n?: number) => void;
  clearAll: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  hydrate: (count) => set({ unreadCount: Math.max(0, Math.round(Number(count) || 0)) }),
  decrement: (n = 1) => set((s) => ({ unreadCount: Math.max(0, s.unreadCount - n) })),
  increment: (n = 1) => set((s) => ({ unreadCount: s.unreadCount + n })),
  clearAll: () => set({ unreadCount: 0 }),
}));
