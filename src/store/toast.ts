import { create } from 'zustand';

export type ToastTone = 'success' | 'critical' | 'info' | 'caution';
export interface ToastMessage {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

let nextId = 1;

export const useToastStore = create<{ current: ToastMessage | null; clear: (id: number) => void }>((set) => ({
  current: null,
  clear: (id) => set((s) => (s.current?.id === id ? { current: null } : s)),
}));

/** Shows the blueprint's toast above the current screen. */
export function showToast(title: string, tone: ToastTone = 'success', body?: string) {
  const id = nextId++;
  useToastStore.setState({ current: { id, tone, title, body } });
  setTimeout(() => useToastStore.getState().clear(id), 2400);
}
