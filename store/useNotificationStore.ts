import { create } from 'zustand';

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAt: string;
  readAt?: string | Date | null;
}

type NotificationState = {
  notifications: NotificationItem[];
  unreadCount: number;
  isHydrated: boolean;
  setNotifications: (items: NotificationItem[]) => void;
  addNotification: (item: NotificationItem) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  deleteNotification: (id: number) => void;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isHydrated: false,
  setNotifications: (items) => {
    const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unread = sorted.filter(n => !n.isRead).length;
    set({ notifications: sorted, unreadCount: unread, isHydrated: true });
  },
  addNotification: (item) => set((state) => {
    if (state.notifications.some(n => n.id === item.id)) {
      return state;
    }
    const sorted = [item, ...state.notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const unread = sorted.filter(n => !n.isRead).length;
    return {
      notifications: sorted,
      unreadCount: unread
    };
  }),
  markRead: (id) => set((state) => {
    const updated = state.notifications.map((n) => {
      if (n.id === id && !n.isRead) {
        return { ...n, isRead: true, readAt: new Date().toISOString() };
      }
      return n;
    });
    const unread = updated.filter(n => !n.isRead).length;
    return {
      notifications: updated,
      unreadCount: unread
    };
  }),
  markAllRead: () => set((state) => {
    const updated = state.notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }));
    return {
      notifications: updated,
      unreadCount: 0
    };
  }),
  deleteNotification: (id) => set((state) => {
    const filtered = state.notifications.filter(n => n.id !== id);
    const unread = filtered.filter(n => !n.isRead).length;
    return {
      notifications: filtered,
      unreadCount: unread
    };
  }),
}));
