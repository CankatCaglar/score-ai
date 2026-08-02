"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  FileText,
  Globe,
  Info,
  Lightbulb,
  Minus,
  Plus,
  Trophy,
  Upload,
  Users,
  X,
} from "lucide-react";
import { FaInstagram } from "react-icons/fa6";
import { toast } from "sonner";
import {
  BRAND_PROMISE_MAX_LENGTH,
  MAX_COMPETITORS,
  MIN_HISTORICAL_MEDIA,
  computeCompletion,
  type BrandIntelligenceCompletion,
  type BrandIntelligenceProfile,
  type Competitor,
  type TrustProof,
} from "@/lib/brand-intelligence/types";
import { getCatalogSectorPostingAverage } from "@/lib/benchmark/sector-posting";
import { withReturnTo } from "@/lib/dashboard/return-navigation";
import { tipNoCompetitorsOnAnalyze } from "@/lib/notifications/product-tips";
import { requestNotificationsRefresh } from "@/lib/notifications/toast-analysis";

type PublicProfile = BrandIntelligenceProfile & {
  completion: BrandIntelligenceCompletion;
};

type IntegrationsPublic = {
  instagram: {
    connected: boolean;
    username: string | null;
    configured?: boolean;
  };
};

function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex h-full min-h-0 min-w-0 flex-col rounded-2xl border border-brand-dark/8 bg-white p-4 sm:p-5 ${className}`}
    >
      <div className="mb-3.5 shrink-0">
        <h2 className="text-sm font-semibold text-brand-dark">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs leading-snug text-brand-dark/45">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Tamamlandı") {
    return <CheckCircle2 className="size-[18px] text-[#2F9E44]" />;
  }
  if (status === "Opsiyonel") {
    return <Minus className="size-[18px] text-brand-dark/35" />;
  }
  return <AlertCircle className="size-[18px] text-[#D64545]" />;
}

function emptyProfile(): PublicProfile {
  return {
    id: "",
    ownerEmail: "",
    brandPromise: "",
    competitors: [],
    brandAccount: {
      instagram: { connected: false, username: null, igUserId: null },
      websiteUrl: null,
      historicalMedia: [],
    },
    trustProofs: [],
    createdAt: null,
    updatedAt: null,
    completion: {
      score: 0,
      sections: {
        brandPromise: "Eksik",
        competitors: "Eksik",
        historical: "Opsiyonel",
        trustProofs: "Eksik",
      },
    },
  };
}

function postingPerformance(userPosts: number, sectorAvg: number) {
  if (userPosts <= 0) {
    return {
      tone: "idle" as const,
      label: "Başlangıç",
      hint: "Hadi ilk analizinle ritmini başlat.",
      Icon: Minus,
    };
  }
  if (userPosts > sectorAvg) {
    return {
      tone: "up" as const,
      label: "Sektörün üstünde",
      hint: "Güçlü tempo. Yeni analizle ivmeyi koru.",
      Icon: ArrowUp,
    };
  }
  if (userPosts === sectorAvg) {
    return {
      tone: "flat" as const,
      label: "Sektörle aynı",
      hint: "Dengedesin. Bir analiz daha ile öne geç.",
      Icon: Minus,
    };
  }
  return {
    tone: "down" as const,
    label: "Sektörün altında",
    hint: "Hadi yeni analiz yap, sektör ritmine yetiş.",
    Icon: ArrowDown,
  };
}

function PostingBar({
  value,
  max,
  fillClass,
}: {
  value: number;
  max: number;
  fillClass: string;
}) {
  const width = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-dark/8">
      <div
        className={`h-full rounded-full transition-all duration-500 ${fillClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function BenchmarkPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PublicProfile>(emptyProfile);
  const [brandPromise, setBrandPromise] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [integrations, setIntegrations] = useState<IntegrationsPublic | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [monthlyPostCount, setMonthlyPostCount] = useState(0);
  const trustInputRef = useRef<HTMLInputElement>(null);
  const historicalInputRef = useRef<HTMLInputElement>(null);
  const promiseSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPromise = useRef("");

  const sectorPostingAverage = useMemo(
    () => getCatalogSectorPostingAverage(),
    [],
  );
  const postingStats = useMemo(() => {
    const performance = postingPerformance(
      monthlyPostCount,
      sectorPostingAverage,
    );
    const chartMax = Math.max(sectorPostingAverage, monthlyPostCount, 1);
    const toneStyles = {
      up: {
        badge: "bg-[#EAF6EC] text-[#1D6A27]",
        iconWrap: "bg-[#42B24D]/15 text-[#1D6A27]",
        bar: "bg-[#42B24D]",
        ring: "border-[#42B24D]/25",
      },
      flat: {
        badge: "bg-brand-dark/6 text-brand-dark/70",
        iconWrap: "bg-brand-dark/8 text-brand-dark/70",
        bar: "bg-brand-dark/55",
        ring: "border-brand-dark/12",
      },
      down: {
        badge: "bg-[#FFF1E8] text-[#C2410C]",
        iconWrap: "bg-[#FFEDD5] text-[#C2410C]",
        bar: "bg-[#F97316]",
        ring: "border-[#F97316]/20",
      },
      idle: {
        badge: "bg-brand-neon/25 text-brand-dark",
        iconWrap: "bg-brand-neon/40 text-brand-dark",
        bar: "bg-brand-dark/25",
        ring: "border-brand-dark/10",
      },
    }[performance.tone];
    return { performance, chartMax, toneStyles };
  }, [monthlyPostCount, sectorPostingAverage]);

  const igConnected =
    integrations?.instagram.connected || profile.brandAccount.instagram.connected;
  const igUsername =
    integrations?.instagram.username || profile.brandAccount.instagram.username;

  const completion = useMemo(
    () =>
      computeCompletion(
        {
          ...profile,
          brandPromise,
          brandAccount: {
            ...profile.brandAccount,
            instagram: {
              ...profile.brandAccount.instagram,
              connected: igConnected,
              username: igUsername,
            },
          },
        },
        { instagramConnected: igConnected },
      ),
    [profile, brandPromise, igConnected, igUsername],
  );

  const score = completion.score;
  const circle = useMemo(() => {
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    return { radius, circumference, strokeDashoffset };
  }, [score]);

  const applyProfile = (next: PublicProfile) => {
    setProfile(next);
    setBrandPromise(next.brandPromise);
    setWebsiteUrl(next.brandAccount.websiteUrl ?? "");
    lastSavedPromise.current = next.brandPromise;
  };

  const reloadProfile = async () => {
    const res = await fetch("/api/dashboard/benchmark");
    if (!res.ok) throw new Error("load failed");
    const data = (await res.json()) as {
      profile: PublicProfile;
      integrations: IntegrationsPublic;
    };
    applyProfile(data.profile);
    setIntegrations(data.integrations);
    return data.profile;
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/benchmark", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as {
          profile: PublicProfile;
          integrations: IntegrationsPublic;
        };
        if (cancelled) return;
        setProfile(data.profile);
        setBrandPromise(data.profile.brandPromise);
        setWebsiteUrl(data.profile.brandAccount.websiteUrl ?? "");
        lastSavedPromise.current = data.profile.brandPromise;
        setIntegrations(data.integrations);
        if ((data.profile.competitors?.length ?? 0) === 0) {
          tipNoCompetitorsOnAnalyze();
        }
      } catch (error) {
        if ((error as Error).name === "AbortError" || cancelled) return;
        toast.error("Benchmark verileri yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          "/api/dashboard/analyses?dateRange=30d&scoreRange=all&pageSize=50&page=1",
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          analyses?: Array<{ createdAtMs?: number; updatedAtMs?: number }>;
          total?: number;
        };
        if (cancelled) return;

        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthStartMs = monthStart.getTime();

        const fromList = (data.analyses ?? []).filter((item) => {
          const ts = item.updatedAtMs || item.createdAtMs || 0;
          return ts >= monthStartMs;
        }).length;

        setMonthlyPostCount(fromList);
      } catch {
        // kartlar 0 ile kalır
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const flag = searchParams.get("instagram");
    if (!flag) return;
    if (flag === "connected") {
      const posts = Number(searchParams.get("posts") || "0");
      const postsWarning = searchParams.get("posts_warning");
      const igUser = searchParams.get("ig_user");
      if (postsWarning === "low" || (posts > 0 && posts < MIN_HISTORICAL_MEDIA)) {
        toast.message(
          igUser
            ? `@${igUser} bağlandı · ${posts} içerik alındı`
            : `Instagram bağlandı · ${posts} içerik alındı`,
          {
            description: `Analiz için en az ${MIN_HISTORICAL_MEDIA} içerik önerilir. Eksik kalanları manuel yükleyebilirsin.`,
          },
        );
      } else if (postsWarning === "none" || posts === 0) {
        toast.message("Instagram hesabı bağlandı", {
          description:
            "Henüz içerik çekilemedi. En fazla 6 görsel/video manuel yükleyebilirsin.",
        });
      } else {
        toast.success(
          igUser
            ? `@${igUser} bağlandı · ${posts} içerik alındı`
            : `Instagram bağlandı · ${posts} içerik alındı`,
        );
      }
      const controller = new AbortController();
      void (async () => {
        try {
          const res = await fetch("/api/dashboard/benchmark", {
            cache: "no-store",
            signal: controller.signal,
          });
          if (!res.ok) return;
          const data = (await res.json()) as {
            profile: PublicProfile;
            integrations: IntegrationsPublic;
          };
          setProfile(data.profile);
          setBrandPromise(data.profile.brandPromise);
          setWebsiteUrl(data.profile.brandAccount.websiteUrl ?? "");
          setIntegrations(data.integrations);
        } catch {
          // ignore
        }
      })();
      // Query param’ları temizle (yenilemede toast tekrarı olmasın)
      router.replace("/dashboard/benchmark", { scroll: false });
      return () => controller.abort();
    }
    if (flag === "denied") toast.error("Instagram bağlantısı iptal edildi");
    if (flag === "error") {
      const reason = searchParams.get("reason");
      toast.error(
        reason === "INSTAGRAM_OAUTH_NOT_CONFIGURED"
          ? "Instagram Login henüz yapılandırılmamış"
          : "Instagram bağlantısı başarısız",
      );
    }
  }, [searchParams, router]);

  useEffect(() => {
    const hasPending = profile.competitors.some((c) => c.status === "pending");
    if (!hasPending) return;
    const knownFailedIds = new Set(
      profile.competitors.filter((c) => c.status === "failed").map((c) => c.id),
    );
    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const next = await reloadProfile();
          const newlyFailed = next.competitors.some(
            (c) => c.status === "failed" && !knownFailedIds.has(c.id),
          );
          for (const c of next.competitors) {
            if (c.status === "failed") knownFailedIds.add(c.id);
          }
          if (newlyFailed) requestNotificationsRefresh();
        } catch {
          // ignore poll errors
        }
      })();
    }, 4000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.competitors]);

  // Marka vaadi yazılınca otomatik kaydet + tamamlanma güncelle
  useEffect(() => {
    if (loading) return;
    if (brandPromise === lastSavedPromise.current) return;
    if (promiseSaveTimer.current) clearTimeout(promiseSaveTimer.current);
    promiseSaveTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/dashboard/benchmark", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              brandPromise,
              websiteUrl: websiteUrl.trim() || null,
            }),
          });
          if (!res.ok) return;
          const data = (await res.json()) as { profile: PublicProfile };
          lastSavedPromise.current = brandPromise;
          setProfile(data.profile);
        } catch {
          // sessiz; Kaydet ile tekrar denenebilir
        }
      })();
    }, 600);
    return () => {
      if (promiseSaveTimer.current) clearTimeout(promiseSaveTimer.current);
    };
  }, [brandPromise, websiteUrl, loading]);

  const save = async (andContinue = false) => {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/benchmark", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          brandPromise,
          websiteUrl: websiteUrl.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = (await res.json()) as { profile: PublicProfile };
      applyProfile(data.profile);
      toast.success("Kaydedildi");
      if (andContinue) {
        router.push(
          withReturnTo("/dashboard/yeni-analiz", "/dashboard/benchmark"),
        );
      }
    } catch {
      toast.error("Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const addCompetitor = async () => {
    const input = competitorInput.trim();
    if (!input) return;
    setBusyAction("competitor");
    try {
      const res = await fetch("/api/dashboard/benchmark/competitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = (await res.json()) as { profile?: PublicProfile; error?: string };
      if (!res.ok) {
        if (data.error === "OWN_BRAND_AS_COMPETITOR") {
          throw new Error(
            "Bağlı marka hesabını rakip olarak ekleyemezsin. Rakipler için başka bir hesap/site kullan.",
          );
        }
        if (data.error === "DUPLICATE_COMPETITOR") {
          throw new Error("Bu rakip zaten listede.");
        }
        if (data.error === "MAX_COMPETITORS") {
          throw new Error(`En fazla ${MAX_COMPETITORS} rakip ekleyebilirsin.`);
        }
        throw new Error(data.error || "failed");
      }
      if (data.profile) applyProfile(data.profile);
      setCompetitorInput("");
      toast.success("Rakip eklendi, içerikler çekiliyor");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rakip eklenemedi");
    } finally {
      setBusyAction(null);
    }
  };

  const removeCompetitor = async (id: string) => {
    setBusyAction(`rm-${id}`);
    try {
      const res = await fetch(`/api/dashboard/benchmark/competitors/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { profile?: PublicProfile };
      if (!res.ok) throw new Error("failed");
      if (data.profile) applyProfile(data.profile);
    } catch {
      toast.error("Rakip silinemedi");
    } finally {
      setBusyAction(null);
    }
  };

  const refreshCompetitor = async (id: string) => {
    setBusyAction(`rf-${id}`);
    try {
      const res = await fetch(`/api/dashboard/benchmark/competitors/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = (await res.json()) as { profile?: PublicProfile };
      if (!res.ok) throw new Error("failed");
      if (data.profile) applyProfile(data.profile);
      toast.message("Rakip içerikleri yenileniyor");
    } catch {
      toast.error("Yenileme başlatılamadı");
    } finally {
      setBusyAction(null);
    }
  };

  const addManualPost = async (competitor: Competitor) => {
    const postUrl = window.prompt(
      `${competitor.input} için Instagram post URL’si yapıştırın`,
    );
    if (!postUrl?.trim()) return;
    setBusyAction(`mp-${competitor.id}`);
    try {
      const res = await fetch(
        `/api/dashboard/benchmark/competitors/${competitor.id}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "manual-post", postUrl }),
        },
      );
      const data = (await res.json()) as { profile?: PublicProfile; error?: string };
      if (!res.ok) throw new Error(data.error || "failed");
      if (data.profile) applyProfile(data.profile);
      toast.success("Post eklendi");
    } catch {
      toast.error("Post eklenemedi");
    } finally {
      setBusyAction(null);
    }
  };

  const connectInstagram = async () => {
    setBusyAction("ig");
    try {
      if (integrations?.instagram.connected) {
        const res = await fetch("/api/dashboard/integrations/instagram", {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("failed");
        await reloadProfile();
        toast.success("Instagram bağlantısı kaldırıldı");
        return;
      }

      const res = await fetch("/api/dashboard/integrations/instagram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          returnTo: "/dashboard/benchmark",
        }),
      });
      const data = (await res.json()) as {
        authorizeUrl?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.authorizeUrl) {
        toast.error(
          data.message ||
            "Instagram Login yapılandırılmamış. Şimdilik manuel içerik yükleyebilirsin.",
        );
        return;
      }
      window.location.assign(data.authorizeUrl);
    } catch {
      toast.error("Instagram bağlanamadı");
    } finally {
      setBusyAction(null);
    }
  };

  const scanWebsite = async () => {
    const url = websiteUrl.trim();
    if (!url) {
      toast.error("Web sitesi URL’si girin");
      return;
    }
    setBusyAction("scan");
    try {
      const res = await fetch("/api/dashboard/benchmark/website-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ websiteUrl: url }),
      });
      const data = (await res.json()) as {
        profile?: PublicProfile;
        scanned?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "scan failed");
      if (data.profile) applyProfile(data.profile);
      toast.success(`${data.scanned ?? 0} görsel tarandı`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tarama başarısız");
    } finally {
      setBusyAction(null);
    }
  };

  const uploadTrust = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusyAction("trust");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/dashboard/benchmark/trust-proofs", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          profile?: PublicProfile;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "upload");
        if (data.profile) applyProfile(data.profile);
      }
      toast.success("Güven kanıtı yüklendi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yükleme başarısız");
    } finally {
      setBusyAction(null);
      if (trustInputRef.current) trustInputRef.current.value = "";
    }
  };

  const removeTrust = async (proof: TrustProof) => {
    setBusyAction(`trust-${proof.id}`);
    try {
      const res = await fetch(
        `/api/dashboard/benchmark/trust-proofs?id=${encodeURIComponent(proof.id)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { profile?: PublicProfile };
      if (!res.ok) throw new Error("failed");
      if (data.profile) applyProfile(data.profile);
    } catch {
      toast.error("Silinemedi");
    } finally {
      setBusyAction(null);
    }
  };

  const uploadHistorical = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusyAction("hist");
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append("file", file);
      const res = await fetch("/api/dashboard/benchmark/historical-media", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as {
        profile?: PublicProfile;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "upload");
      if (data.profile) applyProfile(data.profile);
      toast.success("İçerikler yüklendi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Yükleme başarısız");
    } finally {
      setBusyAction(null);
      if (historicalInputRef.current) historicalInputRef.current.value = "";
    }
  };

  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!infoOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!infoRef.current?.contains(event.target as Node)) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [infoOpen]);

  const PerformanceIcon = postingStats.performance.Icon;

  if (loading) {
    return (
      <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
        <p className="text-sm text-brand-dark/50">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden space-y-5 px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight text-brand-dark sm:text-3xl">
              Stratejik Marka Bilgileri
            </h1>
            <span
              ref={infoRef}
              className="relative mt-1.5 inline-flex shrink-0 items-center"
            >
              <button
                type="button"
                onClick={() => setInfoOpen((open) => !open)}
                onMouseEnter={() => {
                  if (window.matchMedia("(hover: hover)").matches) {
                    setInfoOpen(true);
                  }
                }}
                onMouseLeave={() => {
                  if (window.matchMedia("(hover: hover)").matches) {
                    setInfoOpen(false);
                  }
                }}
                aria-expanded={infoOpen}
                aria-controls="benchmark-info-tooltip"
                aria-label="Stratejik Marka Bilgileri hakkında"
                className="inline-flex items-center justify-center text-brand-dark/40 transition-colors hover:text-brand-dark/70"
              >
                <Info className="size-4" strokeWidth={2} />
              </button>
              {infoOpen ? (
                <span
                  id="benchmark-info-tooltip"
                  role="tooltip"
                  className="absolute right-0 top-full z-40 mt-2 w-64 max-w-[min(16rem,calc(100vw-2.5rem))] rounded-xl border border-brand-dark/10 bg-brand-dark px-3 py-2 text-left text-[11px] leading-relaxed text-white shadow-lg sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
                >
                  Bu sayfa Brand DNA değildir. Marka vaadi, rakipler, geçmiş içerikler
                  ve güven kanıtlarını toplayarak Brand Intelligence analizini güçlendirir.
                </span>
              ) : null}
            </span>
          </div>
          <p className="mt-1 max-w-xl text-sm text-brand-dark/55">
            Brand Intelligence analizini güçlendirmek için eksik kaynakları tamamlayın.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2F9E44] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#278A3A] disabled:opacity-60"
          >
            <Check className="size-4" />
            Kaydet ve Devam Et
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-brand-dark/15 px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-dark/[0.03]"
          >
            Atla
          </button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col gap-4 xl:h-full">
          <section className="shrink-0 rounded-2xl border border-brand-dark/8 bg-white p-4">
            <p className="text-sm font-semibold text-brand-dark">Tamamlanma Durumu</p>
            <div className="mt-5 flex flex-col items-center">
              <div className="relative size-36">
                <svg className="size-36 -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r={circle.radius}
                    fill="none"
                    stroke="rgba(29,29,31,0.08)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={circle.radius}
                    fill="none"
                    stroke="#42B24D"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={circle.circumference}
                    strokeDashoffset={circle.strokeDashoffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-semibold tracking-tight text-brand-dark">
                    {score}
                  </p>
                  <p className="text-xs text-brand-dark/40">/ 100</p>
                </div>
              </div>
            </div>
            <ul className="mt-6 space-y-4">
              {(
                [
                  ["Marka Vaadi", completion.sections.brandPromise],
                  ["Rakip Kaynakları", completion.sections.competitors],
                  ["Geçmiş İçerikler", completion.sections.historical],
                  ["Güven Kanıtları", completion.sections.trustProofs],
                ] as const
              ).map(([label, status]) => (
                <li
                  key={label}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-brand-dark/75">{label}</span>
                  <span className="inline-flex items-center gap-1.5 text-brand-dark/55">
                    {status}
                    <StatusIcon status={status} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-1 flex-col justify-start rounded-2xl border border-[#42B24D]/20 bg-[#F3FAF4] p-4 sm:p-5">
            <div className="flex items-start gap-2.5">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-[#2F9E44]" />
              <div className="min-w-0">
                <p className="text-m font-semibold text-brand-dark">Neden gerekli?</p>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-dark/60">
                  Bu girdiler Brand Tone, Value Proposition, Differentiation ve Trust
                  Building analizlerini daha isabetli hale getirir. Brand DNA’dan farklı
                  olarak burada rekabet, geçmiş iletişim ve güven kanıtları toplanır.
                </p>
              </div>
            </div>
          </section>
        </aside>

        <div className="grid min-w-0 h-full grid-cols-1 items-stretch gap-4 md:grid-cols-2">
          <SectionCard
            title="Marka Vaadi"
            subtitle="Markanı farklılaştıran ana değeri tek cümleyle yaz."
          >
            <textarea
              value={brandPromise}
              onChange={(e) =>
                setBrandPromise(e.target.value.slice(0, BRAND_PROMISE_MAX_LENGTH))
              }
              rows={5}
              placeholder="Doğal içerikleri bilimsel testlerle birleştirerek güvenilir cilt bakımı sunar."
              className="w-full resize-none rounded-xl border border-brand-dark/10 bg-[#FAFBFA] px-3 py-2.5 text-sm leading-relaxed text-brand-dark outline-none focus:border-[#42B24D]/50"
            />
            <div className="mt-2 flex min-w-0 items-start justify-between gap-3 text-[11px] text-brand-dark/40">
              <span className="min-w-0 break-words">
                Value Proposition · Differentiation · Brand Tone
              </span>
              <span className="shrink-0 tabular-nums">
                {brandPromise.length} / {BRAND_PROMISE_MAX_LENGTH}
              </span>
            </div>
          </SectionCard>

          <SectionCard
            title="Rakip Kaynakları"
            subtitle="Rakip Instagram hesabı veya web sitesi URL’si ekleyin. Instagram’da son paylaşımlar, sitede ise ana sayfa görselleri incelenir."
          >
            <div className="flex gap-2">
              <input
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void addCompetitor();
                  }
                }}
                placeholder="@rakiphesap veya https://..."
                className="min-w-0 flex-1 rounded-xl border border-brand-dark/10 bg-[#FAFBFA] px-3 py-2 text-sm outline-none focus:border-[#42B24D]/50"
              />
              <button
                type="button"
                disabled={
                  busyAction === "competitor" ||
                  profile.competitors.length >= MAX_COMPETITORS
                }
                onClick={() => void addCompetitor()}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-dark text-white hover:opacity-90 disabled:opacity-50"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.competitors.map((c) => (
                <div
                  key={c.id}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-dark/10 bg-white px-2.5 py-1 text-xs text-brand-dark/75"
                >
                  {c.type === "instagram" ? (
                    <FaInstagram className="size-3.5 text-[#D62976]" />
                  ) : (
                    <Globe className="size-3.5 text-brand-dark/45" />
                  )}
                  <span className="truncate">{c.input}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      c.status === "ready"
                        ? "bg-green-100 text-green-700"
                        : c.status === "failed"
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-700"
                    }`}
                    title={
                      c.status === "ready"
                        ? c.type === "instagram"
                          ? `${c.posts.length} paylaşım alındı`
                          : `${c.posts.length} site görseli alındı`
                        : c.status === "failed"
                          ? c.errorMessage || "Çekim başarısız"
                          : "İçerikler çekiliyor"
                    }
                  >
                    {c.status === "ready"
                      ? `${c.posts.length} görsel`
                      : c.status === "failed"
                        ? "Hata"
                        : "…"}
                  </span>
                  {c.status === "failed" ? (
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-brand-dark/50 hover:text-brand-dark"
                      onClick={() => void refreshCompetitor(c.id)}
                    >
                      Yenile
                    </button>
                  ) : null}
                  {c.status === "failed" || c.status === "ready" ? (
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-brand-dark/50 hover:text-brand-dark"
                      title="Manuel Instagram post URL’si ekle"
                      onClick={() => void addManualPost(c)}
                    >
                      URL
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyAction === `rm-${c.id}`}
                    onClick={() => void removeCompetitor(c.id)}
                    className="rounded-full p-0.5 hover:bg-brand-dark/5"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-brand-dark/40">
              Differentiation analizi için kullanılır. Yeşil sayı = çekilen görsel
              adedi.
              <br />
              En fazla {MAX_COMPETITORS} rakip (
              {profile.competitors.length}/{MAX_COMPETITORS}). Bağlı marka hesabını
              rakip olarak ekleyemezsin.
            </p>
          </SectionCard>

          <SectionCard
            title="Marka Hesabı Bağla"
            subtitle="Kendi Instagram’ını bağla, kendi web siteni tara veya geçmiş içeriklerini manuel yükle."
          >
            <div className="flex h-full min-h-0 flex-col gap-2">
              <button
                type="button"
                disabled={busyAction === "ig"}
                onClick={() => void connectInstagram()}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-dark/10 bg-white px-3 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/[0.03] disabled:opacity-60"
              >
                <FaInstagram className="size-4 text-[#D62976]" />
                {igConnected
                  ? `Bağlı${igUsername ? ` @${igUsername}` : ""} · Kopar`
                  : "Instagram Hesabını Bağla"}
              </button>
              {!igConnected ? (
                <p className="text-[11px] leading-snug text-brand-dark/40">
                  Instagram’a giriş yapıp hesabını doğrularsın; başkasının
                  kullanıcı adını yazarak bağlanamazsın.
                </p>
              ) : null}
              <div className="flex shrink-0 gap-2">
                <input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://www.marka.com"
                  className="min-w-0 flex-1 rounded-xl border border-brand-dark/10 bg-[#FAFBFA] px-3 py-2 text-sm outline-none focus:border-[#42B24D]/50"
                />
                <button
                  type="button"
                  disabled={busyAction === "scan"}
                  onClick={() => void scanWebsite()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-dark/10 bg-white px-3 py-2 text-xs font-semibold text-brand-dark hover:bg-brand-dark/[0.03] disabled:opacity-60"
                >
                  <Globe className="size-3.5" />
                  Tara
                </button>
              </div>
              <div className="relative shrink-0 py-1 text-center text-[11px] text-brand-dark/35">
                <span className="relative z-10 bg-white px-2">veya manuel yükle</span>
                <span className="absolute inset-x-0 top-1/2 h-px bg-brand-dark/8" />
              </div>
              <input
                ref={historicalInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
                multiple
                className="hidden"
                onChange={(e) => void uploadHistorical(e.target.files)}
              />
              <button
                type="button"
                disabled={busyAction === "hist"}
                onClick={() => historicalInputRef.current?.click()}
                className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-dark/[0.04] px-3 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/[0.07] disabled:opacity-60"
              >
                <Upload className="size-4" />
                Görsel / Video Yükle
              </button>
              <p className="mt-auto pt-1 text-[11px] leading-relaxed text-brand-dark/40">
                Tara: kendi sitenin ana sayfasındaki görselleri geçmiş içerik olarak kaydeder
                (Brand Consistency / Memory). Instagram bağlamak istemezsen son 6 içeriği
                aşağıdan manuel yükleyebilirsin.
                {profile.brandAccount.historicalMedia.length > 0
                  ? ` · ${profile.brandAccount.historicalMedia.length} içerik kayıtlı`
                  : ""}
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Güven Kanıtları"
            subtitle="Sertifika, test sonucu, müşteri yorumu veya garanti belgesi yükleyin."
          >
            <div className="flex h-full min-h-0 flex-col">
              <input
                ref={trustInputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => void uploadTrust(e.target.files)}
              />
              <button
                type="button"
                disabled={busyAction === "trust"}
                onClick={() => trustInputRef.current?.click()}
                className="flex min-h-[140px] w-full flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-dark/15 bg-[#FAFBFA] px-4 py-6 text-center hover:border-[#42B24D]/40 disabled:opacity-60"
              >
                <FileText className="size-6 text-brand-dark/35" />
                <span className="text-sm font-medium text-brand-dark/70">
                  PDF, PNG, JPG veya WEBP yükle
                </span>
                <span className="text-[11px] text-brand-dark/40">
                  Dermatolojik test, ISO/GMP, müşteri yorumu · max 10 dosya, 10 MB
                </span>
              </button>
              {profile.trustProofs.length > 0 ? (
                <ul className="mt-3 shrink-0 space-y-1.5">
                  {profile.trustProofs.map((proof) => (
                    <li
                      key={proof.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-brand-dark/[0.03] px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate text-brand-dark/70">{proof.fileName}</span>
                      <button
                        type="button"
                        onClick={() => void removeTrust(proof)}
                        className="rounded p-0.5 hover:bg-brand-dark/5"
                      >
                        <X className="size-3.5 text-brand-dark/40" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-auto pt-3 text-left text-[11px] text-brand-dark/40">
                Trust Building · Conversion Potential
              </p>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
        <div
          className={`flex h-full flex-col rounded-2xl border bg-white p-5 ${postingStats.toneStyles.ring}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Trophy
                className="size-6 shrink-0 text-[#1D6A27] sm:size-7"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-dark">
                  Paylaşım Ortalamanız
                </p>
                <p className="mt-0.5 text-xs text-brand-dark/45">
                  Bu ay analiz ettiğiniz içerikler
                </p>
              </div>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${postingStats.toneStyles.badge}`}
            >
              <PerformanceIcon className="size-3.5" strokeWidth={2.5} />
              {postingStats.performance.label}
            </span>
          </div>

          <div className="mt-5 flex items-end gap-2">
            <p className="text-4xl font-semibold tracking-tight text-brand-dark sm:text-5xl">
              {monthlyPostCount}
            </p>
            <p className="mb-1 text-sm font-semibold text-brand-dark/40">/ ay</p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-brand-dark/45">
              <span>Sizin ritminiz</span>
              <span>{monthlyPostCount} paylaşım</span>
            </div>
            <PostingBar
              value={monthlyPostCount}
              max={postingStats.chartMax}
              fillClass={postingStats.toneStyles.bar}
            />
            {/* Sağ karttaki "Siz X / Y" satırıyla aynı yüksekliği koru */}
            <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-transparent select-none" aria-hidden>
              <span>Siz</span>
              <span>0 / 0</span>
            </div>
          </div>

          <p
            className={`mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold ${
              postingStats.performance.tone === "up"
                ? "text-[#1D6A27]"
                : postingStats.performance.tone === "down"
                  ? "text-[#C2410C]"
                  : "text-brand-dark/70"
            }`}
          >
            <PerformanceIcon className="size-3.5 shrink-0" strokeWidth={2.5} />
            {postingStats.performance.hint}
          </p>
        </div>

        <div className="flex h-full flex-col rounded-2xl border border-brand-dark/10 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Users
                className="size-6 shrink-0 text-brand-dark/75 sm:size-7"
                strokeWidth={1.75}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-dark">
                  Sektör Paylaşım Ortalaması
                </p>
                <p className="mt-0.5 text-xs text-brand-dark/45">
                  Sektör aylık analiz ortalaması
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-dark/6 px-2.5 py-1 text-xs font-semibold text-brand-dark/65">
              Katalog ortalama
            </span>
          </div>

          <div className="mt-5 flex items-end gap-2">
            <p className="text-4xl font-semibold tracking-tight text-brand-dark sm:text-5xl">
              {sectorPostingAverage}
            </p>
            <p className="mb-1 text-sm font-semibold text-brand-dark/40">/ ay</p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-medium text-brand-dark/45">
              <span>Sektör referansı</span>
              <span>{sectorPostingAverage} paylaşım</span>
            </div>
            <PostingBar
              value={sectorPostingAverage}
              max={postingStats.chartMax}
              fillClass="bg-brand-dark/70"
            />
            <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-brand-dark/40">
              <span>Siz</span>
              <span
                className={
                  postingStats.performance.tone === "up"
                    ? "font-semibold text-[#1D6A27]"
                    : postingStats.performance.tone === "down"
                      ? "font-semibold text-[#C2410C]"
                      : "font-semibold text-brand-dark/60"
                }
              >
                {monthlyPostCount} / {sectorPostingAverage}
              </span>
            </div>
          </div>

          <p className="mt-auto pt-4 text-sm font-semibold text-brand-dark/70">
            Sektör ritmi bu. Hadi yeni analiz yap, kendi çizgini ölç.
          </p>
        </div>
      </div>

      <div className="mt-2 rounded-2xl border border-[#42B24D]/15 bg-[#EAF6EC] px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-brand-dark/60 md:text-sm">
            Brand Intelligence için daha güçlü analiz hazır. Kaynakları tamamladıkça
            analiz güven seviyesi artar.
          </p>
          <Link
            href={withReturnTo("/dashboard/yeni-analiz", "/dashboard/benchmark")}
            onClick={() => void save(false)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#1D4D28] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#163B1F] sm:ml-auto sm:w-auto"
          >
            Analize Dön
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
