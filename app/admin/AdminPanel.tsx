"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  CalendarDays,
  Copy,
  Download,
  FileText,
  Globe,
  LogOut,
  RefreshCw,
  Search,
  TrendingUp,
  Trash2,
  Users,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  adminLogout,
  deleteWaitlistEntry,
  listWaitlist,
  type WaitlistEntry,
  type WaitlistSort,
} from "@/actions/admin";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatLocale(locale: "tr" | "en"): string {
  return locale === "en" ? "EN" : "TR";
}

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return dateFormatter.format(new Date(ms));
}

function sanitizeFilePart(value: string): string {
  return value.replaceAll(/[^\w.-]+/g, "-");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdminPanel({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [sort, setSort] = useState<WaitlistSort>("newest");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);
  const [localeFilter, setLocaleFilter] = useState<"all" | "tr" | "en">("all");
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const localeMenuRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (nextSort: WaitlistSort) => {
    try {
      const data = await listWaitlist(nextSort);
      setEntries(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("FIREBASE_ADMIN_NOT_CONFIGURED")) {
        setErrorCode("FIREBASE_ADMIN_NOT_CONFIGURED");
      } else if (message.includes("UNAUTHORIZED")) {
        router.replace("/admin/login");
        return;
      } else {
        setErrorCode("UNKNOWN");
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(sort);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sort, load]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setIsExportOpen(false);
      }
      if (
        localeMenuRef.current &&
        !localeMenuRef.current.contains(event.target as Node)
      ) {
        setIsLocaleMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExportOpen(false);
        setIsLocaleMenuOpen(false);
        setIsLogoutConfirmOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleToggleSort = () => {
    setIsLoading(true);
    setErrorCode(null);
    setSort((prev) => (prev === "newest" ? "oldest" : "newest"));
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (entry: WaitlistEntry) => {
    const confirmed = window.confirm(
      `"${entry.email}" waitlist kaydı silinsin mi? Bu işlem geri alınamaz.`,
    );
    if (!confirmed) return;

    setDeletingId(entry.id);
    try {
      await deleteWaitlistEntry(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.success("Kayıt silindi.");
    } catch {
      toast.error("Kayıt silinemedi. Tekrar deneyin.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminLogout();
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopyalandı.");
    } catch {
      toast.error("Kopyalanamadı.");
    }
  };

  const filtered = entries.filter(
    (e) =>
      (localeFilter === "all" || e.locale === localeFilter) &&
      (e.email.toLowerCase().includes(query.toLowerCase()) ||
        e.id.toLowerCase().includes(query.toLowerCase())),
  );

  const statsNow = useMemo(() => new Date().getTime(), []);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const last7DaysMs = statsNow - 7 * 24 * 60 * 60 * 1000;
  const last30DaysMs = statsNow - 30 * 24 * 60 * 60 * 1000;
  const last7DaysCount = entries.filter(
    (entry) => (entry.createdAt ?? 0) >= last7DaysMs,
  ).length;
  const last30DaysCount = entries.filter(
    (entry) => (entry.createdAt ?? 0) >= last30DaysMs,
  ).length;
  const todayCount = entries.filter(
    (entry) => (entry.createdAt ?? 0) >= dayStartMs,
  ).length;
  const trCount = entries.filter((entry) => entry.locale === "tr").length;
  const enCount = entries.filter((entry) => entry.locale === "en").length;
  const totalForLocaleShare = Math.max(entries.length, 1);
  const trPercent = Math.round((trCount / totalForLocaleShare) * 100);
  const enPercent = Math.round((enCount / totalForLocaleShare) * 100);

  const exportRows = filtered.map((entry, index) => ({
    sira: index + 1,
    email: entry.email,
    dil: formatLocale(entry.locale),
    id: entry.id,
    eklenme: formatDate(entry.createdAt),
  }));

  const handleExportCsv = () => {
    setIsExportOpen(false);
    if (!exportRows.length) {
      toast.error("Dışa aktarılacak kayıt bulunamadı.");
      return;
    }
    const headers = ["Sıra", "E-posta", "Dil", "ID", "Eklenme"];
    const escapeCsv = (value: string | number) =>
      `"${String(value).replaceAll('"', '""')}"`;

    const lines = [
      headers.map(escapeCsv).join(","),
      ...exportRows.map((row) =>
        [row.sira, row.email, row.dil, row.id, row.eklenme]
          .map(escapeCsv)
          .join(","),
      ),
    ];

    // BOM sayesinde Excel Türkçe karakterleri doğru açar.
    const content = `\uFEFF${lines.join("\n")}`;
    const now = new Date().toISOString().slice(0, 10);
    const blob = new Blob([content], {
      type: "text/csv;charset=utf-8;",
    });
    downloadBlob(blob, `waitlist-${sanitizeFilePart(now)}.csv`);
  };

  const buildExportHtml = () => {
    const rows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${row.sira}</td>
            <td>${row.email}</td>
            <td>${row.dil}</td>
            <td>${row.id}</td>
            <td>${row.eklenme}</td>
          </tr>`,
      )
      .join("");

    return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Score AI Waitlist</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f2d33; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    p { margin: 0 0 16px; color: #4e6367; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #d9e0e1; text-align: left; padding: 8px; }
    th { background: #f3f7f7; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Score AI - Waitlist</h1>
  <p>Toplam ${exportRows.length} kayıt · ${new Date().toLocaleString("tr-TR")}</p>
  <table>
    <thead>
      <tr>
        <th>Sıra</th>
        <th>E-posta</th>
        <th>Dil</th>
        <th>ID</th>
        <th>Eklenme</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
  };

  const handleExportWord = () => {
    setIsExportOpen(false);
    if (!exportRows.length) {
      toast.error("Dışa aktarılacak kayıt bulunamadı.");
      return;
    }
    const html = buildExportHtml();
    const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
    const now = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `waitlist-${sanitizeFilePart(now)}.doc`);
  };

  const handleExportPdf = () => {
    setIsExportOpen(false);
    if (!exportRows.length) {
      toast.error("Dışa aktarılacak kayıt bulunamadı.");
      return;
    }
    const now = new Date().toISOString().slice(0, 10);

    // jsPDF'in default fontu bazı Türkçe karakterleri bozabildiği için
    // PDF çıktısında ASCII-safe başlık/metin kullanıyoruz.
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Score AI - Waitlist", 40, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Toplam ${exportRows.length} kayit - ${new Date().toLocaleString("tr-TR")}`,
      40,
      60,
    );

    autoTable(doc, {
      startY: 76,
      head: [["Sira", "E-posta", "Dil", "ID", "Eklenme"]],
      body: exportRows.map((row) => [
        row.sira,
        row.email,
        row.dil,
        row.id,
        row.eklenme.replaceAll("ı", "i"),
      ]),
      theme: "striped",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 6,
      },
      headStyles: {
        fillColor: [15, 45, 51],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 130 },
        2: { cellWidth: 44 },
        3: { cellWidth: 210 },
        4: { cellWidth: 110 },
      },
      margin: { left: 40, right: 40 },
    });

    doc.save(`waitlist-${sanitizeFilePart(now)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-bg-offwhite [&_button:not(:disabled)]:cursor-pointer">
      <header className="border-b border-brand-dark/10 bg-brand-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Sayfanın başına dön"
              className="rounded-md p-0.5"
            >
              <Logo className="h-5 w-auto text-white sm:h-6" />
            </button>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-neon sm:px-2.5 sm:text-[11px]">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-white/60 sm:inline">
              {adminEmail}
            </span>
            <button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-2 text-sm font-medium text-white transition hover:border-brand-neon hover:text-brand-neon sm:gap-2 sm:px-3"
            >
              <LogOut className="size-4" />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-full text-center sm:w-auto sm:text-left">
            <h1 className="text-[2rem] font-semibold text-brand-dark sm:text-2xl">
              Bekleme Listesi
            </h1>
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-brand-dark/60 sm:justify-start">
              <Users className="size-4" />
              Toplam {entries.length} kayıt
            </p>
          </div>

          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <div className="relative col-span-3 sm:col-span-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-dark/30" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="E-posta veya ID ara"
                className="h-10 w-full rounded-lg border border-brand-dark/15 bg-bg-light pl-9 pr-3 text-sm text-brand-dark outline-none transition placeholder:text-brand-dark/30 focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20 sm:w-56"
              />
            </div>
            <button
              type="button"
              onClick={handleToggleSort}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 sm:w-auto"
            >
              <ArrowDownUp className="size-4" />
              {sort === "newest" ? "En yeni" : "En eski"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setErrorCode(null);
                void load(sort);
              }}
              disabled={isLoading}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50 sm:w-auto"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Yenile
            </button>
            <div ref={exportMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsExportOpen((v) => !v)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 sm:w-auto"
              >
                <Download className="size-4" />
                Export
              </button>
              {isExportOpen && (
                <div className="absolute right-0 top-12 z-20 min-w-[170px] overflow-hidden rounded-xl border border-brand-dark/10 bg-bg-light p-1 shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brand-dark transition hover:bg-brand-dark/5"
                  >
                    <Download className="size-4" />
                    CSV indir
                  </button>
                  <button
                    type="button"
                    onClick={handleExportWord}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brand-dark transition hover:bg-brand-dark/5"
                  >
                    <FileText className="size-4" />
                    Word indir
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-brand-dark transition hover:bg-brand-dark/5"
                  >
                    <FileText className="size-4" />
                    PDF indir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-brand-dark/10 bg-bg-light p-4 shadow-sm">
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-brand-neon/80 text-brand-dark">
              <Users className="size-5" />
            </div>
            <p className="text-xs font-medium text-brand-dark/80">Total Waitlist</p>
            <p className="mt-1 text-3xl font-semibold text-brand-dark">
              {entries.length.toLocaleString("tr-TR")}
            </p>
            <p className="mt-1 text-xs text-brand-dark/45">Toplam bekleme listesi</p>
          </article>

          <article className="rounded-2xl border border-brand-dark/10 bg-bg-light p-4 shadow-sm">
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-brand-neon/80 text-brand-dark">
              <TrendingUp className="size-5" />
            </div>
            <p className="text-xs font-medium text-brand-dark/80">Last 7 Days</p>
            <p className="mt-1 text-3xl font-semibold text-green-700">+{last7DaysCount}</p>
            <p className="mt-1 text-xs text-brand-dark/45">Son 7 günde eklenenler</p>
          </article>

          <article className="rounded-2xl border border-brand-dark/10 bg-bg-light p-4 shadow-sm">
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-brand-neon/80 text-brand-dark">
              <CalendarDays className="size-5" />
            </div>
            <p className="text-xs font-medium text-brand-dark/80">Today / Last 30 Days</p>
            <p className="mt-1 text-3xl font-semibold text-green-700">
              +{todayCount}
              <span className="ml-2 text-base font-medium text-brand-dark/55">
                / +{last30DaysCount}
              </span>
            </p>
            <p className="mt-1 text-xs text-brand-dark/45">
              Bugün gelenler / son 30 gun
            </p>
          </article>

          <article className="rounded-2xl border border-brand-dark/10 bg-bg-light p-4 shadow-sm">
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-brand-neon/80 text-brand-dark">
              <Globe className="size-5" />
            </div>
            <p className="text-xs font-medium text-brand-dark/80">Languages</p>
            <p className="mt-1 text-2xl font-semibold text-brand-dark">
              TR {trPercent}% / EN {enPercent}%
            </p>
            <p className="mt-1 text-xs text-brand-dark/45">Dil dağılımı</p>
          </article>
        </section>

        <div className="mt-6 overflow-hidden rounded-2xl border border-brand-dark/10 bg-bg-light shadow-sm">
          {errorCode === "FIREBASE_ADMIN_NOT_CONFIGURED" ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-semibold text-brand-dark">
                Firebase Admin yapılandırması eksik
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-brand-dark/60">
                Waitlist kayıtlarını görmek için <code>.env.local</code> içinde{" "}
                <code>FIREBASE_ADMIN_CLIENT_EMAIL</code> ve{" "}
                <code>FIREBASE_ADMIN_PRIVATE_KEY</code> değerlerini tanımlayıp
                sunucuyu yeniden başlatın.
              </p>
            </div>
          ) : errorCode === "UNKNOWN" ? (
            <div className="px-6 py-16 text-center">
              <p className="text-base font-semibold text-brand-dark">
                Kayıtlar yüklenemedi
              </p>
              <p className="mt-2 text-sm text-brand-dark/60">
                Lütfen yenileyip tekrar deneyin.
              </p>
            </div>
          ) : isLoading ? (
            <div className="px-6 py-16 text-center text-sm text-brand-dark/50">
              Yükleniyor...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand-dark/10 text-xs uppercase tracking-wider text-brand-dark/50">
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">E-posta</th>
                      <th className="px-4 py-3 font-semibold">
                        <div ref={localeMenuRef} className="relative inline-flex items-center gap-1.5">
                          <span>Dil</span>
                          <button
                            type="button"
                            onClick={() => setIsLocaleMenuOpen((v) => !v)}
                            className="inline-flex size-5 items-center justify-center rounded-md border border-brand-dark/15 text-brand-dark/55 transition hover:bg-brand-dark/5 hover:text-brand-dark"
                            aria-label="Dil filtresi"
                            title="Dil filtresi"
                          >
                            <ChevronDown className="size-3.5" />
                          </button>
                          {isLocaleMenuOpen && (
                            <div className="absolute left-0 top-7 z-20 min-w-[90px] rounded-lg border border-brand-dark/10 bg-bg-light p-1 shadow-lg">
                              {(["all", "tr", "en"] as const).map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => {
                                    setLocaleFilter(option);
                                    setIsLocaleMenuOpen(false);
                                  }}
                                  className={`block w-full rounded-md px-2 py-1.5 text-left text-xs font-medium transition hover:bg-brand-dark/5 ${
                                    localeFilter === option
                                      ? "bg-brand-neon/80 text-brand-dark"
                                      : "text-brand-dark/70"
                                  }`}
                                >
                                  {option === "all" ? "Tümü" : option.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold">ID</th>
                      <th className="px-4 py-3 font-semibold">Eklenme</th>
                      <th className="px-4 py-3 text-right font-semibold">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-14 text-center text-sm text-brand-dark/50"
                        >
                          {query ? "Eşleşen kayıt bulunamadı." : "Henüz kayıt yok."}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((entry, index) => (
                        <tr
                          key={entry.id}
                          className="border-b border-brand-dark/5 last:border-0 hover:bg-brand-dark/2"
                        >
                          <td className="px-4 py-3 text-brand-dark/40">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 font-medium text-brand-dark">
                            <button
                              type="button"
                              onClick={() => handleCopy(entry.email)}
                              className="inline-flex items-center gap-1.5 transition hover:text-brand-dark/70"
                              title="E-postayı kopyala"
                            >
                              {entry.email}
                              <Copy className="size-3 text-brand-dark/30" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-brand-dark/70">
                            <span className="rounded-full border border-brand-dark/10 px-2 py-1 text-xs font-semibold">
                              {formatLocale(entry.locale)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleCopy(entry.id)}
                              className="inline-flex max-w-[220px] items-center gap-1.5 font-mono text-xs text-brand-dark/50 transition hover:text-brand-dark/80"
                              title="ID'yi kopyala"
                            >
                              <span className="truncate">{entry.id}</span>
                              <Copy className="size-3 shrink-0" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-brand-dark/70">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDelete(entry)}
                              disabled={deletingId === entry.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2 className="size-3.5" />
                              {deletingId === entry.id ? "Siliniyor..." : "Sil"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-brand-dark/10 md:hidden">
                {filtered.length === 0 ? (
                  <div className="px-6 py-14 text-center text-sm text-brand-dark/50">
                    {query ? "Eşleşen kayıt bulunamadı." : "Henüz kayıt yok."}
                  </div>
                ) : (
                  <>
                    {filtered.map((entry, index) => (
                      <article key={entry.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => handleCopy(entry.email)}
                              className="inline-flex max-w-full items-center gap-2 text-left text-base font-semibold text-brand-dark transition hover:text-brand-dark/75"
                            >
                              <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-brand-dark/45">
                                #{index + 1}
                              </span>
                              <span className="truncate">{entry.email}</span>
                              <Copy className="size-3.5 text-brand-dark/40" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDelete(entry)}
                            disabled={deletingId === entry.id}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                            {deletingId === entry.id ? "Siliniyor..." : "Sil"}
                          </button>
                        </div>

                        <div className="mt-3 rounded-lg border border-brand-dark/10 bg-bg-offwhite px-3 py-2">
                          <div className="flex items-center gap-8">
                            <span className="shrink-0 text-[12px] uppercase tracking-wider text-brand-dark/45">
                              ID
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(entry.id)}
                              className="inline-flex min-w-0 items-center gap-1.5 font-mono text-xs text-brand-dark/60 transition hover:text-brand-dark"
                            >
                              <span className="truncate">{entry.id}</span>
                              <Copy className="size-3.5 shrink-0" />
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 text-xs text-brand-dark/55">
                          Dil: {formatLocale(entry.locale)} · Eklenme: {formatDate(entry.createdAt)}
                        </p>
                      </article>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/35 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-brand-dark">Emin misiniz?</h2>
            <p className="mt-2 text-sm text-brand-dark/65">
              Admin panelinden guvenli cikis yapmak uzere oldugunuzu onaylayin.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(false)}
                disabled={isLoggingOut}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-brand-dark/15 px-4 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-dark px-4 text-sm font-medium text-white transition hover:bg-brand-dark/90 disabled:opacity-50"
              >
                {isLoggingOut ? "Cikiliyor..." : "Cikis Yap"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
