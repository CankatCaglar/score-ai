import type { AppLocale } from "@/i18n/routing";

/** Optimistic locale while next-intl navigation is in flight (blog TR↔EN). */
let pendingLocale: AppLocale | null = null;
const listeners = new Set<() => void>();

export function setPendingLocale(next: AppLocale | null): void {
  if (pendingLocale === next) return;
  pendingLocale = next;
  listeners.forEach((listener) => listener());
}

export function getPendingLocale(): AppLocale | null {
  return pendingLocale;
}

export function subscribePendingLocale(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
