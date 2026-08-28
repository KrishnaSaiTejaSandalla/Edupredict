import { create } from 'zustand';
import {
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationAllowedByPrefs,
} from '@/lib/notification-utils';

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
  preferences: NotificationPreferences;
  isHydrated: boolean;
  setNotifications: (items: NotificationItem[]) => void;
  setPreferences: (prefs: NotificationPreferences) => void;
  addNotification: (item: NotificationItem) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  deleteNotification: (id: number) => void;
};

const calculateUnread = (items: NotificationItem[], prefs: NotificationPreferences) => {
  return items.filter((n) => !n.isRead && isNotificationAllowedByPrefs(n, prefs)).length;
};

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  isHydrated: false,
  setNotifications: (items) => {
    const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    set((state) => ({
      notifications: sorted,
      unreadCount: calculateUnread(sorted, state.preferences),
      isHydrated: true,
    }));
  },
  setPreferences: (prefs) => {
    set((state) => ({
      preferences: prefs,
      unreadCount: calculateUnread(state.notifications, prefs),
    }));
  },
  addNotification: (item) =>
    set((state) => {
      if (state.notifications.some((n) => n.id === item.id)) {
        return state;
      }
      const sorted = [item, ...state.notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return {
        notifications: sorted,
        unreadCount: calculateUnread(sorted, state.preferences),
      };
    }),
  markRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) => {
        if (n.id === id && !n.isRead) {
          return { ...n, isRead: true, readAt: new Date().toISOString() };
        }
        return n;
      });
      return {
        notifications: updated,
        unreadCount: calculateUnread(updated, state.preferences),
      };
    }),
  markAllRead: () =>
    set((state) => {
      const updated = state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: new Date().toISOString(),
      }));
      return {
        notifications: updated,
        unreadCount: 0,
      };
    }),
  deleteNotification: (id) =>
    set((state) => {
      const filtered = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: filtered,
        unreadCount: calculateUnread(filtered, state.preferences),
      };
    }),
}));
