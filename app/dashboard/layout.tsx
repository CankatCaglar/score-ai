"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Brain,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Plus,
  Settings,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const primaryNav: NavItem[] = [
  { label: "Genel Bakış", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analizler", href: "/dashboard/analizler", icon: BarChart3 },
];

const toolsNav: NavItem[] = [
  { label: "Brand DNA", href: "/dashboard/brand-brain", icon: Brain },
  { label: "Benchmark", href: "/dashboard/benchmark", icon: Trophy },
  { label: "Creative Memory", href: "/dashboard/creative-memory", icon: Sparkles },
  { label: "AI İçgörüler", href: "/dashboard/icgoruler", icon: Lightbulb },
];

const settingsNav: NavItem[] = [
  { label: "Ayarlar", href: "/dashboard/ayarlar", icon: Settings },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActiveRoute(pathname, item.href);
  const { icon: Icon, label, href } = item;
  return (
    <Link
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
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <>
      <div className="px-6 py-6">
        <Link href="/dashboard">
          <Logo className="h-7 w-auto text-white" />
        </Link>
      </div>

      <div className="mx-3 border-t border-white/10" />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          href="/dashboard/yeni-analiz"
          className="mb-3 flex items-center gap-2 rounded-lg bg-brand-neon px-3 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          <Plus className="size-[18px] shrink-0" strokeWidth={2.25} />
          Yeni Analiz
        </Link>

        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="my-3 border-t border-white/10" />

        <div className="space-y-0.5">
          {toolsNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="my-3 border-t border-white/10" />

        <div className="space-y-0.5">
          {settingsNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
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
            <p className="truncate text-xs text-brand-neon">Premium</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-dark text-white lg:flex">
        <SidebarContent pathname={pathname} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col bg-brand-dark text-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Menüyü kapat"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
            <SidebarContent pathname={pathname} />
          </aside>
        </div>
      )}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto bg-bg-offwhite">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 bg-bg-offwhite px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
              aria-label="Menüyü aç"
            >
              <Menu className="size-5" strokeWidth={1.75} />
            </button>
            <Link href="/dashboard">
              <Logo className="h-6 w-auto text-brand-dark" />
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              className="relative flex size-9 items-center justify-center rounded-lg text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
              aria-label="Bildirimler"
            >
              <Bell className="size-5" strokeWidth={1.75} />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-neon ring-2 ring-bg-offwhite" />
            </button>

            <div className="flex size-9 items-center justify-center rounded-full bg-brand-dark/10 text-xs font-semibold text-brand-dark">
              EA
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
