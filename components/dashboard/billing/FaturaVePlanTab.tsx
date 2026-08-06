"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CreditCard,
  Download,
  Loader2,
  Receipt,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { BillingInvoice, BillingSummary } from "@/lib/billing/types";
import type { BillingInterval } from "@/lib/billing/plans";
import {
  PRO_MONTHLY_PRICE_TRY,
  PRO_YEARLY_PRICE_TRY,
} from "@/lib/billing/plans";

function injectCheckoutForm(html: string) {
  const existing = document.getElementById("iyzico-checkout-script");
  if (existing) existing.remove();

  const container = document.getElementById("iyzipay-checkout-form");
  if (container) container.innerHTML = "";

  const wrapper = document.createElement("div");
  wrapper.id = "iyzico-checkout-script";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  wrapper.querySelectorAll("script").forEach((oldScript) => {
    const script = document.createElement("script");
    for (const attr of oldScript.attributes) {
      script.setAttribute(attr.name, attr.value);
    }
    script.text = oldScript.textContent ?? "";
    document.body.appendChild(script);
    oldScript.remove();
  });
}

function formatMoneyTry(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "en" ? "en-TR" : "tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string, locale: string) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

function CardBrandMark({ brand }: { brand: string | null }) {
  const label = (brand || "Card").trim();
  const isVisa = /visa/i.test(label);
  const isMaster = /master/i.test(label);

  return (
    <div
      className={`flex h-8 w-12 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-wide ${
        isVisa
          ? "bg-[#1A1F71] text-white"
          : isMaster
            ? "bg-gradient-to-br from-[#EB001B] to-[#F79E1B] text-white"
            : "bg-brand-dark/10 text-brand-dark/70"
      }`}
    >
      {isVisa ? "VISA" : isMaster ? "MC" : label.slice(0, 4).toUpperCase()}
    </div>
  );
}

export function FaturaVePlanTab() {
  const t = useTranslations("settings");
  const locale = useLocale();

  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [billingEmail, setBillingEmail] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!planModalOpen && !paymentModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [planModalOpen, paymentModalOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, invoicesRes] = await Promise.all([
        fetch("/api/billing/summary", { credentials: "include" }),
        fetch("/api/billing/invoices", { credentials: "include" }),
      ]);

      if (!summaryRes.ok) throw new Error("summary");
      const summaryJson = (await summaryRes.json()) as {
        summary: BillingSummary;
      };
      setSummary(summaryJson.summary);
      setBillingEmail(summaryJson.summary.billingEmail ?? "");
      setInterval(summaryJson.summary.billingInterval ?? "monthly");

      if (invoicesRes.ok) {
        const invoicesJson = (await invoicesRes.json()) as {
          invoices: BillingInvoice[];
        };
        setInvoices(invoicesJson.invoices ?? []);
      }
    } catch {
      toast.error(t("billingLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing === "success") {
      toast.success(t("billingSuccessToast"));
      void load();
      window.history.replaceState({}, "", "/dashboard/ayarlar?tab=fatura");
    } else if (billing === "error") {
      toast.error(t("billingErrorToast"));
      window.history.replaceState({}, "", "/dashboard/ayarlar?tab=fatura");
    }
  }, [t, load]);

  async function startCheckout(selected: BillingInterval) {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interval: selected,
          locale: locale === "en" ? "en" : "tr",
        }),
      });
      const data = (await res.json()) as {
        checkoutFormContent?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.checkoutFormContent) {
        toast.error(data.message || t("checkoutFailed"));
        return;
      }
      injectCheckoutForm(data.checkoutFormContent);
      toast.message(t("checkoutOpened"));
      setPlanModalOpen(false);
    } catch {
      toast.error(t("checkoutFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function changeInterval(selected: BillingInterval) {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: selected, upgradePeriod: "NOW" }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message || t("actionFailed"));
        return;
      }
      toast.success(t("intervalChanged"));
      await load();
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function cancelPlan() {
    if (!window.confirm(t("cancelConfirm"))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        toast.error(data.message || t("actionFailed"));
        return;
      }
      toast.success(t("cancelSuccess"));
      await load();
      setPlanModalOpen(false);
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function reactivate() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/reactivate", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        message?: string;
        needsCheckout?: boolean;
      };
      if (res.ok) {
        toast.success(t("reactivateSuccess"));
        await load();
        return;
      }
      if (data.needsCheckout) {
        await startCheckout(interval);
        return;
      }
      toast.error(data.message || t("actionFailed"));
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function updateCard() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/card-update", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: locale === "en" ? "en" : "tr" }),
      });
      const data = (await res.json()) as {
        checkoutFormContent?: string;
        message?: string;
      };
      if (!res.ok || !data.checkoutFormContent) {
        if (summary?.plan !== "pro") {
          await startCheckout(interval);
          return;
        }
        toast.error(data.message || t("checkoutFailed"));
        return;
      }
      injectCheckoutForm(data.checkoutFormContent);
      toast.message(t("checkoutOpened"));
      setPaymentModalOpen(false);
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveEmail() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/email", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingEmail }),
      });
      if (!res.ok) {
        toast.error(t("billingEmailSaveFailed"));
        return;
      }
      toast.success(t("billingEmailSaved"));
      await load();
    } catch {
      toast.error(t("billingEmailSaveFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading || !summary) {
    return (
      <div className="flex items-center gap-2 text-sm text-brand-dark/55">
        <Loader2 className="size-4 animate-spin" />
        {t("billingLoading")}
      </div>
    );
  }

  const isPro = summary.plan === "pro";
  const isActive = summary.subscriptionStatus === "active";
  const planTitle = !isPro
    ? t("planNormalLabel")
    : summary.billingInterval === "yearly"
      ? t("planProYearly")
      : t("planProMonthly");
  const priceDisplay = !isPro
    ? t("priceFree")
    : summary.billingInterval === "yearly"
      ? t("priceYearlyShort")
      : t("priceMonthlyShort");

  return (
    <div className="space-y-5">
      {!summary.configured && (
        <p className="rounded-xl border border-brand-dark/10 bg-brand-dark/[0.03] px-3.5 py-2.5 text-xs text-brand-dark/55">
          {t("billingNotConfigured")}
        </p>
      )}

      {/* Top row: Plan + Payment */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Current plan */}
        <section className="flex flex-col rounded-2xl border border-brand-dark/8 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-brand-dark/40">
                {t("currentPlan")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold tracking-tight text-brand-dark">
                  {planTitle}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-700"
                      : "bg-brand-dark/8 text-brand-dark/55"
                  }`}
                  title={isActive ? t("statusHintActive") : t("statusHintPassive")}
                >
                  {isActive ? t("statusActive") : t("statusPassive")}
                </span>
              </div>
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3 border-b border-brand-dark/6 pb-3">
              <dt className="text-brand-dark/45">{t("priceLabel")}</dt>
              <dd className="font-semibold text-brand-dark">{priceDisplay}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-b border-brand-dark/6 pb-3">
              <dt className="text-brand-dark/45">{t("nextRenewal")}</dt>
              <dd className="font-medium text-brand-dark/80">
                {isPro && summary.currentPeriodEnd
                  ? formatDate(summary.currentPeriodEnd, locale)
                  : t("noRenewal")}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-brand-dark/45">
                {locale === "en" ? "Analyses" : "Analiz hakkı"}
              </dt>
              <dd className="font-medium text-brand-dark/80">
                {t("quotaLabel", {
                  remaining: summary.analysesRemaining,
                  quota: summary.analysesQuota,
                })}
              </dd>
            </div>
          </dl>

          {summary.cancelAtPeriodEnd && summary.currentPeriodEnd && (
            <p className="mt-3 text-xs text-amber-700">
              {t("cancelScheduled", {
                date: formatDate(summary.currentPeriodEnd, locale),
              })}
            </p>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => setPlanModalOpen(true)}
            className="mt-6 w-full cursor-pointer rounded-xl bg-brand-neon px-4 py-3 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isPro ? t("managePlan") : t("upgradePro")}
          </button>
        </section>

        {/* Payment details */}
        <section className="flex flex-col rounded-2xl border border-brand-dark/8 bg-white p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-brand-dark">
              {t("paymentInfo")}
            </h3>
            <p className="mt-0.5 text-xs text-brand-dark/45">
              {t("paymentInfoDesc")}
            </p>
          </div>

          <div className="mt-5 flex flex-1 flex-col">
            {summary.paymentMethod ? (
              <div className="space-y-4 rounded-xl bg-brand-dark/[0.03] px-4 py-4">
                <div className="flex items-center gap-3">
                  <CardBrandMark brand={summary.paymentMethod.brand} />
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">
                      {t("cardMasked", {
                        brand: summary.paymentMethod.brand || "Card",
                        lastFour: summary.paymentMethod.lastFour || "----",
                      })}
                    </p>
                  </div>
                </div>
                <div className="border-t border-brand-dark/6 pt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-brand-dark/40">
                    {t("billingEmailLabel")}
                  </p>
                  <p className="mt-1 text-sm text-brand-dark/80">
                    {summary.billingEmail || "—"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-start justify-center rounded-xl bg-brand-dark/[0.03] px-4 py-6">
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-white text-brand-dark/50 shadow-sm">
                  <CreditCard className="size-5" strokeWidth={1.75} />
                </div>
                <p className="text-sm text-brand-dark/55">{t("noPaymentMethod")}</p>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => setPaymentModalOpen(true)}
              className="mt-5 w-full cursor-pointer rounded-xl border border-brand-dark/12 bg-white px-4 py-3 text-sm font-semibold text-brand-dark transition hover:bg-brand-dark/[0.03] disabled:opacity-60"
            >
              {summary.paymentMethod ? t("managePaymentMethod") : t("addCard")}
            </button>
          </div>
        </section>
      </div>

      {/* Billing history */}
      <section className="rounded-2xl border border-brand-dark/8 bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-dark/[0.05]">
            <Receipt className="size-4 text-brand-dark/55" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-brand-dark">
              {t("billingHistory")}
            </h3>
            <p className="text-xs text-brand-dark/45">{t("billingHistoryDesc")}</p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <p className="rounded-xl bg-brand-dark/[0.03] px-4 py-4 text-sm text-brand-dark/50">
            {t("billingHistoryEmpty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-brand-dark/8 text-[11px] font-medium uppercase tracking-[0.06em] text-brand-dark/40">
                  <th className="px-2 py-3 font-medium">{t("colDate")}</th>
                  <th className="px-2 py-3 font-medium">{t("colPlan")}</th>
                  <th className="px-2 py-3 font-medium">{t("colAmount")}</th>
                  <th className="px-2 py-3 font-medium">{t("colPaymentMethod")}</th>
                  <th className="px-2 py-3 font-medium">{t("colPeriod")}</th>
                  <th className="px-2 py-3 font-medium">{t("colStatus")}</th>
                  <th className="px-2 py-3 font-medium text-right">{t("colInvoice")}</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-brand-dark/5 text-brand-dark/80 last:border-0"
                  >
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      {formatDate(invoice.date, locale)}
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      {invoice.plan === "pro"
                        ? invoice.period.length === 4
                          ? t("planProYearly")
                          : t("planProMonthly")
                        : t("planNormal")}
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap font-medium">
                      {formatMoneyTry(invoice.amount, locale)}
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      {invoice.paymentMethod}
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap text-brand-dark/65">
                      {invoice.period}
                    </td>
                    <td className="px-2 py-3.5">
                      <span
                        className={`text-sm font-medium ${
                          invoice.status === "paid"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {invoice.status === "paid"
                          ? t("statusPaid")
                          : t("statusFailed")}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-right">
                      {invoice.status === "paid" ? (
                        <a
                          href={`/api/billing/invoices/${invoice.id}/pdf`}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-brand-dark/50 transition hover:bg-brand-dark/5 hover:text-brand-dark"
                          aria-label={t("downloadInvoice")}
                          title={t("downloadInvoice")}
                        >
                          <Download className="size-4" strokeWidth={1.75} />
                        </a>
                      ) : (
                        <span className="text-brand-dark/25">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div id="iyzipay-checkout-form" className="popup" />

      {mounted &&
        planModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-brand-dark/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5 [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer"
            role="dialog"
            aria-modal="true"
            onClick={() => !busy && setPlanModalOpen(false)}
          >
            <div
              className="relative w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="absolute right-3 top-3 inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-brand-dark/50 hover:bg-brand-dark/5"
                aria-label={t("close")}
              >
                <X className="size-4" />
              </button>

              <h3 className="pr-10 text-lg font-semibold text-brand-dark">
                {t("planModalTitle")}
              </h3>
              <p className="mt-1 text-sm text-brand-dark/50">
                {t("planModalSubtitle")}
              </p>

              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-dark/45">
                  {t("chooseInterval")}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["monthly", "yearly"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setInterval(value)}
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-left text-sm transition ${
                        interval === value
                          ? "border-brand-dark bg-brand-dark text-white"
                          : "border-brand-dark/10 bg-white text-brand-dark hover:bg-brand-dark/3"
                    }`}
                  >
                      <span className="block font-semibold">
                        {value === "monthly"
                          ? t("intervalMonthly")
                          : t("intervalYearly")}
                      </span>
                      <span
                        className={`mt-0.5 block text-xs ${
                          interval === value
                            ? "text-white/75"
                            : "text-brand-dark/50"
                        }`}
                      >
                        {value === "monthly"
                          ? `₺${PRO_MONTHLY_PRICE_TRY.toLocaleString("tr-TR")} / ${locale === "en" ? "mo" : "ay"}`
                          : `₺${PRO_YEARLY_PRICE_TRY.toLocaleString("tr-TR")} / ${locale === "en" ? "yr" : "yıl"}`}
                      </span>
                      {value === "yearly" && (
                        <span
                          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            interval === value
                              ? "bg-brand-neon text-brand-dark"
                              : "bg-brand-neon/70 text-brand-dark"
                          }`}
                        >
                          {t("yearlyDiscount")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                {!isPro || summary.cancelAtPeriodEnd || !isActive ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      summary.cancelAtPeriodEnd ||
                      (!isActive && summary.hasActiveSubscription)
                        ? void reactivate()
                        : void startCheckout(interval)
                    }
                    className="cursor-pointer rounded-xl bg-brand-neon px-4 py-2.5 text-sm font-semibold text-brand-dark disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    ) : summary.cancelAtPeriodEnd ||
                      (!isActive && summary.hasActiveSubscription) ? (
                      t("reactivateSubscription")
                    ) : (
                      t("confirmUpgrade")
                    )}
                  </button>
                ) : (
                  <>
                    {summary.billingInterval !== interval && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void changeInterval(interval)}
                        className="cursor-pointer rounded-xl bg-brand-neon px-4 py-2.5 text-sm font-semibold text-brand-dark disabled:opacity-60"
                      >
                        {t("changeInterval")}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void cancelPlan()}
                      className="cursor-pointer rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      {t("cancelSubscription")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        paymentModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-brand-dark/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5 [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer"
            role="dialog"
            aria-modal="true"
            onClick={() => !busy && setPaymentModalOpen(false)}
          >
            <div
              className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="absolute right-3 top-3 inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-brand-dark/50 hover:bg-brand-dark/5"
                aria-label={t("close")}
              >
                <X className="size-4" />
              </button>

              <h3 className="pr-10 text-lg font-semibold text-brand-dark">
                {t("managePaymentMethod")}
              </h3>
              <p className="mt-1 text-sm text-brand-dark/50">
                {t("cardUpdateHint")}
              </p>

              <div className="mt-5 space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-brand-dark/70">
                    {t("billingEmail")}
                  </span>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder={t("billingEmailPlaceholder")}
                    className="w-full rounded-xl border border-brand-dark/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-dark/30"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveEmail()}
                  className="w-full cursor-pointer rounded-xl border border-brand-dark/10 px-4 py-2.5 text-sm font-medium text-brand-dark hover:bg-brand-dark/3 disabled:opacity-60"
                >
                  {t("saveBillingEmail")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void updateCard()}
                  className="w-full cursor-pointer rounded-xl bg-brand-neon px-4 py-2.5 text-sm font-semibold text-brand-dark disabled:opacity-60"
                >
                  {summary.paymentMethod ? t("updateCard") : t("addCard")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
