import { create } from 'zustand';

type NotificationState = {
  unreadCount: number;
  /** Call once on page-load with the server-fetched unread count */
  hydrate: (count: number) => void;
  /** Decrement by n (clamped at 0) */
  decrement: (n?: number) => void;
  /** Set to exactly 0 – used after "mark all read" */
  clearAll: () => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  // Call once on page-load with the server-fetched unread count
  hydrate: (count) => set({ unreadCount: Math.max(0, count) }),
  // Decrement by n (clamped at 0)
  decrement: (n = 1) =>
    set((s) => ({ unreadCount: Math.max(0, s.unreadCount - n) })),
  // Added for instant notification
  increment: (n = 1) => set((s) => ({ unreadCount: s.unreadCount + n })),
  // Set to exactly 0 – used after "mark all read"
  clearAll: () => set({ unreadCount: 0 }),
}));
