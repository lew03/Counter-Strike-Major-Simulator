// Tiny global toast bus. Any module can call toast(...) without prop-drilling; <ToastHost/>
// (rendered once at the app root) subscribes and renders the queue.

export type ToastKind = "info" | "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(message: string, kind: ToastKind = "info", ttl = 3800) {
  const id = nextId++;
  toasts = [...toasts, { id, message, kind }];
  emit();
  if (ttl > 0) setTimeout(() => dismissToast(id), ttl);
  return id;
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}
