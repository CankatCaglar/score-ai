"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Brain,
  ChevronDown,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  Plus,
  Settings,
  Sparkles,
  Star,
  Trophy,
  User,
  X,
} from "lucide-react";
import { useClickOutside } from "../../hooks/useClickOutside";

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

const profileMenuItems = [
  { icon: User, label: "Profil", desc: "Kişisel bilgilerinizi görüntüleyin" },
  { icon: Settings, label: "Hesap Ayarları", desc: "Hesap ve güvenlik ayarları" },
  { icon: Bell, label: "Bildirimler", desc: "Bildirim tercihlerinizi yönetin" },
  { icon: CreditCard, label: "Fatura ve Plan", desc: "Abonelik ve ödeme bilgileri" },
  { icon: HelpCircle, label: "Yardım Merkezi", desc: "Destek ve sık sorulan sorular" },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActiveRoute(pathname, item.href);
  const { icon: Icon, label, href } = item;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
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

function ProfilePopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 mx-2">
      <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="flex size-12 items-center justify-center rounded-full bg-brand-dark/10 text-sm font-semibold text-brand-dark">
                EA
              </div>
              <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white bg-green-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-dark">Ece Aksoy</p>
              <p className="text-xs text-brand-dark/50">Yönetici</p>
              <p className="mt-0.5 truncate text-xs text-brand-dark/40">
                ece.aksoy@example.com
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-brand-dark/4 px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-neon/30 px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                <Star className="size-3" strokeWidth={2} />
                Pro Plan
              </span>
            </div>
            <p className="mt-2 text-xs text-brand-dark/60">
              128 / 500 analiz kullanıldı
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-brand-dark/10">
              <div
                className="h-full rounded-full bg-brand-neon"
                style={{ width: "26%" }}
              />
            </div>
            <p className="mt-1 text-right text-[11px] font-semibold text-brand-dark">
              %26
            </p>
          </div>
        </div>

        <div className="border-t border-brand-dark/8 px-2 py-1.5">
          {profileMenuItems.map(({ icon: Icon, label, desc }) => (
            <button
              key={label}
              type="button"
              onClick={onClose}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-dark/5"
            >
              <Icon className="size-4 shrink-0 text-brand-dark/50" strokeWidth={1.75} />
              <div className="min-w-0 text-left">
                <p className="text-sm font-medium text-brand-dark">{label}</p>
                <p className="text-[11px] text-brand-dark/45">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="border-t border-brand-dark/8 px-2 py-1.5">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-red-50"
          >
            <LogOut className="size-4 shrink-0 text-red-500" strokeWidth={1.75} />
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-red-500">Çıkış Yap</p>
              <p className="text-[11px] text-red-400/70">
                Hesabınızdan güvenli çıkış yapın
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  useClickOutside(profileRef, () => setProfileOpen(false));

  const yeniAnalizActive = isActiveRoute(pathname, "/dashboard/yeni-analiz");

  return (
    <>
      <div className="px-6 py-6">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo className="h-7 w-auto text-white" />
        </Link>
      </div>

      <div className="mx-3 border-t border-white/10" />

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          href="/dashboard/yeni-analiz"
          onClick={onNavigate}
          className={`mb-3 flex cursor-pointer items-center gap-2 rounded-lg bg-brand-neon px-3 py-2.5 text-sm font-semibold text-brand-dark transition-colors hover:opacity-90 ${
            yeniAnalizActive ? "border-l-4 border-white pl-2.5" : ""
          }`}
        >
          <Plus className="size-[18px] shrink-0" strokeWidth={2.25} />
          Yeni Analiz
        </Link>

        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="my-3 border-t border-white/10" />

        <div className="space-y-0.5">
          {toolsNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="my-3 border-t border-white/10" />

        <div className="space-y-0.5">
          {settingsNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="relative border-t border-white/10 p-4" ref={profileRef}>
        {profileOpen && (
          <ProfilePopup onClose={() => setProfileOpen(false)} />
        )}
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white/5 px-3 py-3 transition-colors hover:bg-white/10"
        >
          <div className="relative shrink-0">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
              EA
            </div>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-brand-dark bg-green-400" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-white/90">
              Ece Aksoy
            </p>
            <p className="truncate text-xs text-brand-neon">Premium</p>
          </div>
          <ChevronDown
            className={`size-4 shrink-0 text-white/40 transition-transform ${profileOpen ? "rotate-180" : ""}`}
            strokeWidth={2}
          />
        </button>
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
              className="absolute right-3 top-4 flex size-8 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Menüyü kapat"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto bg-bg-offwhite">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 bg-bg-offwhite px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
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
              className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
              aria-label="Bildirimler"
            >
              <Bell className="size-5" strokeWidth={1.75} />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand-neon/90 ring-2 ring-bg-offwhite" />
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
