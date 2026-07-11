"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  Copy,
  LogOut,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
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

function formatDate(ms: number | null): string {
  if (!ms) return "—";
  return dateFormatter.format(new Date(ms));
}

export function AdminPanel({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [sort, setSort] = useState<WaitlistSort>("newest");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async (nextSort: WaitlistSort) => {
    setIsLoading(true);
    setErrorCode(null);
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
    void load(sort);
  }, [sort, load]);

  const handleToggleSort = () => {
    setSort((prev) => (prev === "newest" ? "oldest" : "newest"));
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
    await adminLogout();
    router.replace("/admin/login");
    router.refresh();
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
      e.email.toLowerCase().includes(query.toLowerCase()) ||
      e.id.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-bg-offwhite">
      <header className="border-b border-brand-dark/10 bg-brand-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-6 w-auto text-white" />
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-neon">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/60 sm:inline">
              {adminEmail}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white transition hover:border-brand-neon hover:text-brand-neon"
            >
              <LogOut className="size-4" />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-brand-dark">
              Bekleme Listesi
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-brand-dark/60">
              <Users className="size-4" />
              Toplam {entries.length} kayıt
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-dark/30" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="E-posta veya ID ara"
                className="h-10 w-56 rounded-lg border border-brand-dark/15 bg-bg-light pl-9 pr-3 text-sm text-brand-dark outline-none transition placeholder:text-brand-dark/30 focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
              />
            </div>
            <button
              type="button"
              onClick={handleToggleSort}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5"
            >
              <ArrowDownUp className="size-4" />
              {sort === "newest" ? "En yeni" : "En eski"}
            </button>
            <button
              type="button"
              onClick={() => load(sort)}
              disabled={isLoading}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-dark/15 bg-bg-light px-3 text-sm font-medium text-brand-dark transition hover:bg-brand-dark/5 disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              Yenile
            </button>
          </div>
        </div>

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
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-brand-dark/50">
              {query ? "Eşleşen kayıt bulunamadı." : "Henüz kayıt yok."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand-dark/10 text-xs uppercase tracking-wider text-brand-dark/50">
                    <th className="px-4 py-3 font-semibold">#</th>
                    <th className="px-4 py-3 font-semibold">E-posta</th>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Eklenme</th>
                    <th className="px-4 py-3 text-right font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, index) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
