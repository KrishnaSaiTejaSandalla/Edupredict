import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  duration: number;
  show: (message: string, type?: ToastType, duration?: number) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  visible: false,
  message: '',
  type: 'info',
  duration: 3000,
  show: (message, type = 'info', duration = 3000) => {
    set({ visible: true, message, type, duration });
  },
  hide: () => set({ visible: false }),
}));

export function useToast() {
  const { visible, message, type, duration, show, hide } = useToastStore();

  return {
    visible,
    message,
    type,
    duration,
    show,
    hide,
    success: (msg: string, dur?: number) => show(msg, 'success', dur),
    error: (msg: string, dur?: number) => show(msg, 'error', dur),
    info: (msg: string, dur?: number) => show(msg, 'info', dur),
  };
}
