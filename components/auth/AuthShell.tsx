"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  FileText,
  Quote,
  ShieldCheck,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";

type AuthShellProps = {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  /** login = sosyal kanıt paneli, simple = daha sade sağ panel */
  variant?: "social" | "simple";
  /** Kayıt gibi uzun formlar için dikey boşlukları sıkılaştırır */
  compact?: boolean;
  footer?: React.ReactNode;
};

export function AuthShell({
  children,
  title,
  subtitle,
  variant = "social",
  compact = false,
  footer,
}: AuthShellProps) {
  const t = useTranslations("auth");

  const stats = [
    { icon: FileText, value: "50K+", label: t("shell.statAnalyses") },
    { icon: TrendingUp, value: "2.5M+", label: t("shell.statEngagement") },
    { icon: Users, value: "1.200+", label: t("shell.statBrands") },
    { icon: ShieldCheck, value: "%98", label: t("shell.statSatisfaction") },
  ];

  const sideQuotes = [
    {
      text: t("shell.quote1"),
      name: t("shell.quote1Name"),
      role: t("shell.quote1Role"),
    },
    {
      text: t("shell.quote2"),
      name: t("shell.quote2Name"),
      role: t("shell.quote2Role"),
    },
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-bg-offwhite">
      {/* Sol form — min-h-full + justify-center: kısa içerik ortalanır, uzun içerikte üstten kaydırılır (kırpılmaz) */}
      <div className="h-full w-full overflow-y-auto overscroll-contain px-5 sm:px-8 lg:w-[42%] lg:px-10 xl:px-14">
        <div
          className={`mx-auto flex min-h-full w-full max-w-[500px] flex-col justify-center ${
            compact
              ? "py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-6"
              : "py-8 pb-[max(2rem,env(safe-area-inset-bottom))]"
          }`}
        >
          <Link href="/" className="inline-flex shrink-0">
            <Logo
              className={`w-auto text-brand-dark ${compact ? "h-6 sm:h-6" : "h-7"}`}
            />
          </Link>

          <div className={compact ? "mt-5 sm:mt-5" : "mt-8 sm:mt-10"}>
            <h1
              className={`font-bold tracking-tight text-brand-dark ${
                compact
                  ? "text-lg sm:text-2xl"
                  : "text-[1.65rem] sm:text-3xl"
              }`}
            >
              {title}
            </h1>
            <p
              className={`text-brand-dark/55 ${
                compact
                  ? "mt-0.5 text-xs leading-snug sm:mt-1 sm:text-sm"
                  : "mt-1.5 text-sm sm:text-[15px]"
              }`}
            >
              {subtitle}
            </p>
          </div>

          <div className={compact ? "mt-3.5 sm:mt-5" : "mt-7 sm:mt-8"}>
            {children}
          </div>

          {footer ? (
            <div className={compact ? "mt-3 sm:mt-4" : "mt-6"}>{footer}</div>
          ) : null}
        </div>
      </div>

      {/* Sağ panel */}
      <aside className="relative hidden h-full overflow-hidden bg-brand-dark lg:flex lg:w-[58%] lg:flex-col lg:justify-center lg:px-10 lg:py-12 xl:px-14">
        <div className="relative mx-auto w-full max-w-[640px]">
          {variant === "social" ? (
            <>
              <h2 className="max-w-xl text-3xl font-bold tracking-tight text-white xl:text-[2.15rem] xl:leading-[1.2]">
                {t.rich("shell.headline", {
                  brand: (chunks) => (
                    <span className="text-brand-neon">{chunks}</span>
                  ),
                })}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/60 xl:text-[15px]">
                {t("shell.tagline")}
              </p>

              <div className="mt-8 grid grid-cols-[1.35fr_1fr] gap-5.5">
                {/* Ana testimonial */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 xl:p-6">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="size-3.5 fill-brand-neon text-brand-neon"
                          strokeWidth={0}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-white/80">
                      {t("shell.ratingLabel")}{" "}
                      <span className="font-normal text-white/40">
                        {t("shell.ratingCount")}
                      </span>
                    </span>
                  </div>

                  <Quote className="mt-4 size-7 text-brand-neon/40" />
                  <p className="mt-2 text-[15px] leading-relaxed text-white/80">
                    {t.rich("shell.mainQuote", {
                      pct: (chunks) => (
                        <span className="font-semibold text-brand-neon">
                          {chunks}
                        </span>
                      ),
                    })}
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-brand-neon/20 text-xs font-bold text-brand-neon">
                      SK
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {t("shell.mainAuthor")}
                      </p>
                      <p className="text-xs text-white/45">
                        {t("shell.mainRole")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Yan quote'lar */}
                <div className="flex flex-col gap-3.5">
                  {sideQuotes.map((q) => (
                    <div
                      key={q.name}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="size-3 fill-brand-neon text-brand-neon"
                            strokeWidth={0}
                          />
                        ))}
                      </div>
                      <p className="mt-2.5 text-xs leading-relaxed text-white/70">
                        {q.text}
                      </p>
                      <div className="mt-3 flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-full bg-brand-neon/20 text-[10px] font-bold text-brand-neon">
                          {q.name
                            .split(" ")
                            .map((p) => p[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {q.name}
                          </p>
                          <p className="text-[10px] text-white/45">{q.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-4 gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-4 xl:px-4">
                {stats.map(({ icon: Icon, value, label }) => (
                  <div key={label} className="text-center">
                    <div className="mx-auto flex size-8 items-center justify-center rounded-full bg-brand-neon/20 text-brand-neon">
                      <Icon className="size-3.5" strokeWidth={1.75} />
                    </div>
                    <p className="mt-2 text-sm font-bold text-white xl:text-base">
                      {value}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-white/45 xl:text-[11px]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-white/35">
                <ShieldCheck className="size-3.5 text-brand-neon/70" strokeWidth={1.75} />
                {t("shell.sslNote")}
              </p>
            </>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 xl:p-10">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-neon/25 text-brand-neon">
                <BarChart3 className="size-6" strokeWidth={1.75} />
              </div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight text-white xl:text-3xl">
                {t("shell.simpleTitle")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                {t("shell.simpleBody")}
              </p>
              <ul className="mt-6 space-y-3 text-sm text-white/70">
                <li className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-neon" />
                  {t("shell.simpleBullet1")}
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-neon" />
                  {t("shell.simpleBullet2")}
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-neon" />
                  {t("shell.simpleBullet3")}
                </li>
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
