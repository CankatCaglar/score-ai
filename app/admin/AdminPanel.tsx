"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BlogAdmin } from "./BlogAdmin";
import { AdminLeadsPanel, type AdminLeadRow } from "./AdminLeadsPanel";
import {
  adminLogout,
  deleteDashboardUser,
  deleteGraderLead,
  deleteWaitlistEntry,
  listDashboardUsers,
  listGraderLeads,
  listWaitlist,
  type AdminListSort,
} from "@/actions/admin";

type AdminView = "waitlist" | "dashboard" | "grader" | "blog";

const TABS: { id: AdminView; label: string }[] = [
  { id: "waitlist", label: "Bekleme Listesi" },
  { id: "dashboard", label: "Dashboard Kayıtları" },
  { id: "grader", label: "Grader E-postaları" },
  { id: "blog", label: "Blog" },
];

export function AdminPanel({ adminEmail }: { adminEmail: string }) {
  const router = useRouter();
  const [view, setView] = useState<AdminView>("waitlist");
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLogoutConfirmOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const listWaitlistRows = useCallback(async (sort: AdminListSort) => {
    const rows = await listWaitlist(sort);
    return rows.map(
      (row): AdminLeadRow => ({
        id: row.id,
        email: row.email,
        locale: row.locale,
        createdAt: row.createdAt,
      }),
    );
  }, []);

  const listDashboardRows = useCallback(async (sort: AdminListSort) => {
    const rows = await listDashboardUsers(sort);
    return rows.map((row): AdminLeadRow => {
      const subtitleParts = [row.displayName, row.company].filter(Boolean);
      return {
        id: row.id,
        email: row.email,
        locale: row.locale,
        createdAt: row.createdAt,
        subtitle: subtitleParts.length ? subtitleParts.join(" · ") : null,
        meta: row.plan,
      };
    });
  }, []);

  const listGraderRows = useCallback(async (sort: AdminListSort) => {
    const rows = await listGraderLeads(sort);
    return rows.map(
      (row): AdminLeadRow => ({
        id: row.id,
        email: row.email,
        locale: row.locale,
        createdAt: row.createdAt,
        subtitle: row.lastSlug ? `Son rapor: ${row.lastSlug}` : null,
        meta: String(row.analysisCount),
      }),
    );
  }, []);

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

      <div className="border-b border-brand-dark/10 bg-bg-light">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-x-1 px-4 sm:px-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`-mb-px border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                view === tab.id
                  ? "border-brand-dark text-brand-dark"
                  : "border-transparent text-brand-dark/50 hover:text-brand-dark"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {view === "blog" ? (
          <BlogAdmin />
        ) : view === "dashboard" ? (
          <AdminLeadsPanel
            title="Dashboard Kayıtları"
            exportSlug="dashboard-users"
            totalLabel="Total Users"
            metaColumnLabel="Plan"
            deleteConfirmLabel={(email) =>
              `"${email}" dashboard kullanıcısı silinsin mi? Bu işlem geri alınamaz.`
            }
            list={listDashboardRows}
            remove={deleteDashboardUser}
          />
        ) : view === "grader" ? (
          <AdminLeadsPanel
            title="Grader E-postaları"
            exportSlug="grader-leads"
            totalLabel="Total Grader Leads"
            metaColumnLabel="Analiz"
            deleteConfirmLabel={(email) =>
              `"${email}" grader kaydı silinsin mi? Bu işlem geri alınamaz.`
            }
            list={listGraderRows}
            remove={deleteGraderLead}
          />
        ) : (
          <AdminLeadsPanel
            title="Bekleme Listesi"
            exportSlug="waitlist"
            totalLabel="Total Waitlist"
            deleteConfirmLabel={(email) =>
              `"${email}" waitlist kaydı silinsin mi? Bu işlem geri alınamaz.`
            }
            list={listWaitlistRows}
            remove={deleteWaitlistEntry}
          />
        )}
      </main>

      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/35 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-2xl border border-brand-dark/10 bg-bg-light p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-brand-dark">
              Emin misiniz?
            </h2>
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
