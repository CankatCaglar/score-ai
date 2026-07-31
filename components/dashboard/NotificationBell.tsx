"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { AppNotification } from "@/lib/notifications/types";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} g`;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const fetchedOnce = useRef(false);

  useClickOutside(rootRef, () => setOpen(false));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: AppNotification[];
        unreadCount?: number;
      };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedOnce.current) {
      fetchedOnce.current = true;
      void load();
    }
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", id }),
      });
    } catch {
      void load();
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/dashboard/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-all" }),
      });
    } catch {
      void load();
    }
  };

  const remove = async (id: string) => {
    const target = notifications.find((item) => item.id === id);
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    if (target && !target.read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    try {
      await fetch(`/api/dashboard/notifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch {
      void load();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
        aria-label="Bildirimler"
        aria-expanded={open}
      >
        <Bell className="size-5" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-brand-neon text-[10px] font-bold text-brand-dark">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-xl shadow-brand-dark/10">
          <div className="flex items-center justify-between gap-3 border-b border-brand-dark/8 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-brand-dark">Bildirimler</p>
              <p className="text-[11px] text-brand-dark/45">
                {unreadCount > 0
                  ? `${unreadCount} okunmamış`
                  : "Hepsi okundu"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-brand-dark/60 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                  title="Tümünü okundu yap"
                >
                  <CheckCheck className="size-3.5" strokeWidth={2} />
                  Okundu
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-brand-dark/45 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                aria-label="Kapat"
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-brand-dark/45">
                Yükleniyor…
              </p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-brand-dark/5">
                  <Bell className="size-4 text-brand-dark/40" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-brand-dark">
                  Bildirim yok
                </p>
                <p className="mt-1 text-xs text-brand-dark/45">
                  Analiz ve hatırlatmalar burada görünür.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-dark/6">
                {notifications.map((item) => {
                  const content = (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-snug ${
                              item.read
                                ? "font-medium text-brand-dark/70"
                                : "font-semibold text-brand-dark"
                            }`}
                          >
                            {item.title}
                          </p>
                          <span className="shrink-0 text-[10px] font-medium text-brand-dark/40">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-brand-dark/50">
                          {item.body}
                        </p>
                      </div>
                      {!item.read ? (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-neon" />
                      ) : null}
                    </>
                  );

                  return (
                    <li key={item.id} className="group relative">
                      <div
                        className={`flex gap-2 px-4 py-3 transition-colors ${
                          item.read ? "bg-white" : "bg-brand-neon/8"
                        }`}
                      >
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => {
                              if (!item.read) void markRead(item.id);
                              setOpen(false);
                            }}
                            className="flex min-w-0 flex-1 gap-2 text-left"
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!item.read) void markRead(item.id);
                            }}
                            className="flex min-w-0 flex-1 cursor-pointer gap-2 text-left"
                          >
                            {content}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void remove(item.id)}
                          className="mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-brand-dark/30 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          aria-label="Bildirimi kaldır"
                          title="Kaldır"
                        >
                          <Trash2 className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
