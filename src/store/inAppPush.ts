import { create } from 'zustand';

/**
 * A push that arrived while the app is open, shown as the in-app notification banner
 * (components/ui/PushBanner.tsx). Android and iOS don't show the system notification for an
 * app in the foreground, so this is what people see.
 */
export interface InAppPush {
  id: number;
  /** The notification's kind (its `type`), for the icon. */
  type: string;
  urgent: boolean;
  title: string;
  body?: string;
  /** Opens what it's about; absent when there's nothing to open. */
  open?: () => void;
}

let nextId = 1;
let timer: ReturnType<typeof setTimeout> | null = null;

export const useInAppPush = create<{ current: InAppPush | null; dismiss: () => void }>((set) => ({
  current: null,
  dismiss: () => {
    if (timer) clearTimeout(timer);
    timer = null;
    set({ current: null });
  },
}));

/** Shows a push; a newer one replaces it. Urgent ones stay longer (someone is waiting). */
export function showInAppPush(push: Omit<InAppPush, 'id'>) {
  if (timer) clearTimeout(timer);
  useInAppPush.setState({ current: { ...push, id: nextId++ } });
  timer = setTimeout(() => useInAppPush.getState().dismiss(), push.urgent ? 9000 : 6000);
}
