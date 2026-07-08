'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/store/useNotificationStore';

export default function RealtimeListener({ role }: { role?: string }) {
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    async function fetchNotifications() {
      try {
        const headers: Record<string, string> = {};
        if (role) {
          headers['x-role'] = role;
        }
        const res = await fetch('/api/notifications/latest', { headers });
        if (res.ok) {
          const data = await res.json();
          const store = useNotificationStore.getState();
          // Only hydrate if the store is empty — avoid overwriting
          // a larger set loaded by the notifications page (100 items)
          if (!store.isHydrated || store.notifications.length === 0) {
            store.setNotifications(data);
          } else {
            // Merge any new notifications the store doesn't have yet
            const existingIds = new Set(store.notifications.map(n => n.id));
            for (const n of data) {
              if (!existingIds.has(n.id)) {
                store.addNotification(n);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    }

    function connect() {
      const url = role ? `/api/notifications/stream?role=${encodeURIComponent(role)}` : '/api/notifications/stream';
      eventSource = new EventSource(url);

      eventSource.addEventListener('notification', (e: MessageEvent) => {
        try {
          const notif = JSON.parse(e.data);
          useNotificationStore.getState().addNotification(notif);
        } catch (err) {
          console.error('Failed to parse SSE notification payload', err);
        }
      });

      eventSource.addEventListener('message', (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data);
          // Dispatch custom window event for Message page listeners
          window.dispatchEvent(new CustomEvent('ep-message', { detail: msg }));
        } catch (err) {
          console.error('Failed to process incoming real-time message:', err);
        }
      });

      eventSource.addEventListener('entity-change', (e: MessageEvent) => {
        try {
          const change = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent('ep-entity-change', { detail: change }));
        } catch (err) {
          console.error('Failed to process incoming real-time entity change:', err);
        }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    // Attach sync callback globally
    (window as any).__ep_hydrate_unread = fetchNotifications;

    fetchNotifications();
    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [role]);

  return null;
}
