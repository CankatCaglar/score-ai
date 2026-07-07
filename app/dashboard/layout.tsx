"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Bell,
  Brain,
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
  Target,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

const navItems = [
  { label: "Genel Bakış", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analizler", href: "/dashboard/analizler", icon: BarChart3 },
  { label: "Brand Brain", href: "/dashboard/brand-brain", icon: Brain },
  { label: "Benchmark", href: "/dashboard/benchmark", icon: Target },
  { label: "İçgörüler", href: "/dashboard/icgoruler", icon: Sparkles },
  { label: "Takım", href: "/dashboard/takim", icon: Users },
  { label: "Ayarlar", href: "/dashboard/ayarlar", icon: Settings },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Genel Bakış",
  "/dashboard/analizler": "Analizler",
  "/dashboard/brand-brain": "Brand Brain",
  "/dashboard/benchmark": "Benchmark",
  "/dashboard/icgoruler": "İçgörüler",
  "/dashboard/takim": "Takım",
  "/dashboard/ayarlar": "Ayarlar",
};

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const pageTitle = pageTitles[pathname] ?? "Dashboard";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 shrink-0 flex-col bg-brand-dark text-white">
        <div className="px-6 py-7">
          <Link href="/dashboard">
            <Image
              src="/logo-disi.svg"
              alt="Score AI"
              width={132}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>
        </div>

        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = isActiveRoute(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-l-4 border-brand-neon bg-white/10 pl-2.5 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
              EA
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white/90">
                Ece Aksoy
              </p>
              <p className="truncate text-xs text-white/70">Yönetici</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex h-screen flex-1 flex-col overflow-y-auto bg-bg-offwhite">
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between bg-bg-offwhite px-8">
          <h1 className="text-2xl font-semibold text-brand-dark">{pageTitle}</h1>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-brand-neon px-4 py-2 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
            >
              <Plus className="size-4" strokeWidth={2} />
              Yeni Analiz
            </button>

            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-lg text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
              aria-label="Bildirimler"
            >
              <Bell className="size-5" strokeWidth={1.75} />
            </button>

            <div className="flex size-9 items-center justify-center rounded-full bg-brand-dark/10 text-xs font-semibold text-brand-dark">
              EA
            </div>
          </div>
        </header>

        <main>{children}</main>
      </div>

      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-bg-light p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-brand-dark">
                Yeni İçerik Analizi
              </h2>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-brand-dark/50 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
                aria-label="Modalı kapat"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-brand-dark/15 bg-bg-offwhite px-6 py-10">
              <UploadCloud
                className="size-12 text-brand-dark/25"
                strokeWidth={1.25}
              />
              <p className="mt-4 text-sm font-medium text-brand-dark">
                Görseli veya videoyu sürükleyin
              </p>
              <button
                type="button"
                className="mt-1 text-sm font-medium text-brand-dark hover:underline"
              >
                veya bilgisayardan seçin
              </button>
            </div>

            <div className="mt-6">
              <p className="text-sm text-brand-dark/60">
                Veya URL ile analiz edin:
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  className="flex-1 rounded-lg border border-brand-dark/10 bg-bg-light px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/30 outline-none transition-colors focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
                />
                <button
                  type="button"
                  className="shrink-0 rounded-lg bg-brand-dark px-4 py-2 text-sm font-medium text-brand-neon transition-opacity hover:opacity-90"
                >
                  Analiz Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
