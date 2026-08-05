"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Bell, CheckCheck, Trash2, X } from "lucide-react";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { AppNotification } from "@/lib/notifications/types";
import { toast } from "sonner";
import {
  flushProductTipQueue,
  queuePostAnalysisProductTips,
} from "@/lib/notifications/product-tips";
import {
  localizeStoredNotification,
  parseAnalysisNotificationMeta,
  toAnalysisUiLocale,
} from "@/lib/analysis/display-copy";
import {
  clientAllowsAnalysisStatusNotify,
  clientAllowsInstantNotify,
} from "@/lib/notifications/client-preferences";
import {
  ANALYSIS_WATCH_EVENT,
  isAnalysisWatchActive,
  markAnalysisWatchIdle,
  NOTIFICATIONS_REFRESH_EVENT,
  toastAnalysisCompletedIfAllowed,
} from "@/lib/notifications/toast-analysis";

/** Poll only while an analysis job is in flight (see markAnalysisWatchActive). */
const ACTIVE_POLL_MS = 4_000;

function formatRelativeTime(
  iso: string,
  locale: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t("relativeJustNow");
  if (minutes < 60) return t("relativeMinutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("relativeHours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("relativeDays", { count: days });
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function NotificationBell() {
  const t = useTranslations("dashboard.notifications");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  useClickOutside(rootRef, () => setOpen(false));

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/dashboard/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: AppNotification[];
        unreadCount?: number;
      };
      const items = (data.notifications ?? []).filter(
        (item) => item.type !== "analysis_started",
      );
      setNotifications(items);
      setUnreadCount(items.filter((item) => !item.read).length);

      if (!primedRef.current) {
        for (const item of items) knownIdsRef.current.add(item.id);
        primedRef.current = true;
        return;
      }

      for (const item of items) {
        if (knownIdsRef.current.has(item.id)) continue;
        knownIdsRef.current.add(item.id);
        if (item.read) continue;
        if (item.type === "analysis_completed") {
          markAnalysisWatchIdle();
          const onResultPage =
            typeof window !== "undefined" &&
            window.location.pathname.startsWith("/dashboard/analiz-sonucu");
          const localized = localizeStoredNotification(
            item.type,
            item.title,
            item.body,
            toAnalysisUiLocale(locale),
          );
          const shown = await toastAnalysisCompletedIfAllowed({
            id: item.id,
            analysisId: (() => {
              const href = item.href ?? "";
              const idMatch = href.match(/[?&]id=([^&]+)/i);
              if (idMatch?.[1]) return decodeURIComponent(idMatch[1]);
              return null;
            })(),
            slug: (() => {
              const href = item.href ?? "";
              const slugMatch = href.match(/[?&]slug=([^&]+)/i);
              if (slugMatch?.[1]) return decodeURIComponent(slugMatch[1]);
              return null;
            })(),
            title: localized.title,
            body: localized.body,
            href: item.href,
            viewLabel: t("viewAction"),
            onOpen: (href) => {
              router.push(href);
            },
          });
          if (await clientAllowsInstantNotify()) {
            const meta = parseAnalysisNotificationMeta(item.body);
            const score = meta.score ?? 100;
            void queuePostAnalysisProductTips({
              analysisId: item.id,
              score: Number.isFinite(score) ? score : 100,
            }).then(() => {
              // On result page: tips flush after leaving. Elsewhere: after completed toast.
              if (!onResultPage && shown) {
                flushProductTipQueue({ delayMs: 5200 });
              }
            });
          }
          continue;
        }
        if (item.type === "analysis_failed") {
          markAnalysisWatchIdle();
          if (!(await clientAllowsAnalysisStatusNotify())) continue;
          const localized = localizeStoredNotification(
            item.type,
            item.title,
            item.body,
            toAnalysisUiLocale(locale),
          );
          toast.error(localized.title, {
            description: localized.body,
            duration: 4500,
            ...(item.href
              ? {
                  action: {
                    label: t("openAction"),
                    onClick: () => router.push(item.href!),
                  },
                }
              : {}),
          });
        }
      }
    } catch {
      // keep previous
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [locale, router, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    let intervalId: number | null = null;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void load({ silent: true });
    };

    const syncPolling = () => {
      const shouldPoll = isAnalysisWatchActive();
      if (shouldPoll && intervalId === null) {
        intervalId = window.setInterval(tick, ACTIVE_POLL_MS);
      } else if (!shouldPoll && intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      tick();
      syncPolling();
    };
    const onRefresh = () => {
      tick();
      syncPolling();
    };
    const onWatch = () => syncPolling();

    syncPolling();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    window.addEventListener(ANALYSIS_WATCH_EVENT, onWatch);
    return () => {
      if (intervalId !== null) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh);
      window.removeEventListener(ANALYSIS_WATCH_EVENT, onWatch);
    };
  }, [load]);

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
        aria-label={t("ariaLabel")}
        aria-expanded={open}
      >
        <Bell className="size-5" strokeWidth={1.75} />
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex size-3 items-center justify-center rounded-full bg-brand-dark text-[8px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-2xl border border-brand-dark/10 bg-white shadow-xl shadow-brand-dark/10">
          <div className="flex items-center justify-between gap-3 border-b border-brand-dark/8 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-brand-dark">{t("title")}</p>
              <p className="text-[11px] text-brand-dark/45">
                {unreadCount > 0
                  ? t("unreadCount", { count: unreadCount })
                  : t("allRead")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-brand-dark/60 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                  title={t("markAllReadTitle")}
                >
                  <CheckCheck className="size-3.5" strokeWidth={2} />
                  {t("markAllRead")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-brand-dark/45 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                aria-label={t("closeAria")}
              >
                <X className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-brand-dark/45">
                {t("loading")}
              </p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-brand-dark/5">
                  <Bell className="size-4 text-brand-dark/40" strokeWidth={1.75} />
                </div>
                <p className="text-sm font-medium text-brand-dark">
                  {t("emptyTitle")}
                </p>
                <p className="mt-1 text-xs text-brand-dark/45">
                  {t("emptyBody")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-brand-dark/6">
                {notifications.map((item) => {
                  const localized = localizeStoredNotification(
                    item.type,
                    item.title,
                    item.body,
                    toAnalysisUiLocale(locale),
                  );
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
                            {localized.title}
                          </p>
                          <span className="shrink-0 text-[10px] font-medium text-brand-dark/40">
                            {formatRelativeTime(item.createdAt, locale, t)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-brand-dark/50">
                          {localized.body}
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
                        <button
                          type="button"
                          onClick={() => {
                            if (!item.read) void markRead(item.id);
                          }}
                          className="flex min-w-0 flex-1 cursor-pointer gap-2 text-left"
                        >
                          {content}
                        </button>
                        {item.href ? (
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-brand-dark/35 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                            aria-label={t("openAria")}
                            title={t("openTitle")}
                          >
                            <ArrowUpRight className="size-3.5" strokeWidth={2} />
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void remove(item.id)}
                          className="mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-brand-dark/30 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          aria-label={t("removeAria")}
                          title={t("removeTitle")}
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
