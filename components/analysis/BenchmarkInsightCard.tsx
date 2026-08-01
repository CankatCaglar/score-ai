import Link from "next/link";
import { ArrowUpRight, Target } from "lucide-react";
import type { BenchmarkCommentarySummary } from "@/lib/analysis/insight-summary";

export function BenchmarkInsightCard({
  summary,
  variant = "light",
  showEmptyState = false,
  className = "",
}: {
  summary: BenchmarkCommentarySummary;
  variant?: "light" | "dark";
  /** When true, render a shell + CTA even if there is no benchmark commentary yet. */
  showEmptyState?: boolean;
  className?: string;
}) {
  const isDark = variant === "dark";
  const hasContent =
    summary.available &&
    (summary.strengths.length > 0 ||
      summary.gaps.length > 0 ||
      summary.actions.length > 0);

  if (!hasContent && !showEmptyState) return null;

  const neonButton = (
    <Link
      href="/dashboard/benchmark"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-neon px-3 py-2 text-xs font-semibold text-brand-dark transition-opacity hover:opacity-90"
    >
      Benchmark
      <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
    </Link>
  );

  return (
    <div
      className={
        isDark
          ? `rounded-3xl border border-brand-neon/25 bg-brand-dark p-6 text-white ${className}`
          : `rounded-3xl bg-bg-light p-5 shadow-sm sm:p-6 ${className}`
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={
              isDark
                ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-neon/20"
                : "flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-neon/80"
            }
          >
            <Target
              className={
                isDark ? "size-5 text-brand-neon" : "size-5 text-brand-dark"
              }
              strokeWidth={1.75}
            />
          </div>
          <div>
            <p
              className={
                isDark
                  ? "text-sm font-semibold text-brand-neon"
                  : "text-base font-semibold text-brand-dark"
              }
            >
              Benchmark karşılaştırması
            </p>
            <p
              className={
                isDark
                  ? "mt-1 text-xs text-white/60"
                  : "mt-1 text-xs text-brand-dark/50"
              }
            >
              Marka vaadi, rakipler, geçmiş içerik ve güven kanıtlarına göre
            </p>
          </div>
        </div>
        {neonButton}
      </div>

      {!hasContent ? (
        <p
          className={
            isDark
              ? "mt-5 text-sm leading-relaxed text-white/70"
              : "mt-5 text-sm leading-relaxed text-brand-dark/60"
          }
        >
          Bu analiz için henüz Benchmark odaklı yorum yok. Benchmark’ı doldurup
          yeni bir analiz çalıştırdığınızda rakip, vaat ve güven karşılaştırması
          burada görünür.
        </p>
      ) : (
        <div
          className={
            isDark
              ? "mt-4 space-y-4 text-xs text-white/75"
              : "mt-4 space-y-4 text-sm text-brand-dark/75"
          }
        >
          {summary.gaps.length > 0 ? (
            <div>
              <p
                className={
                  isDark
                    ? "font-semibold text-brand-neon"
                    : "text-xs font-semibold uppercase tracking-wide text-brand-dark/40"
                }
              >
                Benchmark’a göre eksikler
              </p>
              <ul
                className={
                  isDark
                    ? "mt-1.5 list-disc space-y-1.5 pl-5"
                    : "mt-2 space-y-2"
                }
              >
                {summary.gaps.map((item) => (
                  <li key={item.id}>
                    <span
                      className={
                        isDark
                          ? "font-semibold text-white/90"
                          : "font-semibold text-brand-dark"
                      }
                    >
                      {item.label}:
                    </span>{" "}
                    {item.gap || item.status}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary.strengths.length > 0 ? (
            <div>
              <p
                className={
                  isDark
                    ? "font-semibold text-brand-neon"
                    : "text-xs font-semibold uppercase tracking-wide text-brand-dark/40"
                }
              >
                Benchmark’a göre güçlü yönler
              </p>
              <ul
                className={
                  isDark
                    ? "mt-1.5 list-disc space-y-1.5 pl-5"
                    : "mt-2 space-y-2"
                }
              >
                {summary.strengths.map((item) => (
                  <li key={item.id}>
                    <span
                      className={
                        isDark
                          ? "font-semibold text-white/90"
                          : "font-semibold text-brand-dark"
                      }
                    >
                      {item.label}:
                    </span>{" "}
                    {item.status}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {summary.actions.length > 0 ? (
            <div>
              <p
                className={
                  isDark
                    ? "font-semibold text-brand-neon"
                    : "text-xs font-semibold uppercase tracking-wide text-brand-dark/40"
                }
              >
                Benchmark odaklı aksiyonlar
              </p>
              <ul
                className={
                  isDark
                    ? "mt-1.5 list-disc space-y-1.5 pl-5"
                    : "mt-2 space-y-2"
                }
              >
                {summary.actions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
