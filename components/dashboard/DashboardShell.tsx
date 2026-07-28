"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Brain,
  ChevronDown,
  ChevronLeft,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { logoutUser } from "@/actions/auth";
import { auth } from "@/lib/firebase";
import { useClickOutside } from "@/hooks/useClickOutside";

export type MembershipPlan = "normal" | "pro";

export type DashboardUser = {
  email: string;
  name: string;
  initials: string;
  picture?: string;
  plan?: MembershipPlan;
};

function planLabel(plan: MembershipPlan = "normal") {
  return plan === "pro" ? "Pro" : "Normal";
}

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
];

const settingsNav: NavItem[] = [
  { label: "Ayarlar", href: "/dashboard/ayarlar", icon: Settings },
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

function ProfilePopup({
  user,
  onClose,
  onLogout,
}: {
  user: DashboardUser;
  onClose: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 mx-2">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt=""
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-12 items-center justify-center rounded-full bg-brand-dark/10 text-sm font-semibold text-brand-dark">
                  {user.initials}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-dark">{user.name}</p>
              <p className="text-xs text-brand-dark/50">{planLabel(user.plan)}</p>
              <p className="mt-0.5 truncate text-xs text-brand-dark/40">
                {user.email}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-dark/8 px-2 py-1.5">
          <Link
            href="/dashboard/ayarlar"
            onClick={onClose}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-dark/5"
          >
            <HelpCircle className="size-4 shrink-0 text-brand-dark/50" strokeWidth={1.75} />
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-brand-dark">Yardım Merkezi</p>
              <p className="text-[11px] text-brand-dark/45">
                Destek ve sık sorulan sorular
              </p>
            </div>
          </Link>
        </div>

        <div className="border-t border-brand-dark/8 px-2 py-1.5">
          <button
            type="button"
            onClick={onLogout}
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
  user,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  user: DashboardUser;
  onNavigate?: () => void;
  onLogout: () => void;
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
          <ProfilePopup
            user={user}
            onClose={() => setProfileOpen(false)}
            onLogout={() => {
              setProfileOpen(false);
              onLogout();
            }}
          />
        )}
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white/5 px-3 py-3 transition-colors hover:bg-white/10"
        >
          <div className="relative shrink-0">
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.picture}
                alt=""
                className="size-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
                {user.initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-white/90">
              {user.name}
            </p>
            <p className="truncate text-xs text-brand-neon">
              {planLabel(user.plan)}
            </p>
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

export function DashboardShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: DashboardUser;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAnalysisDetail = /^\/dashboard\/analizler\/.+/.test(pathname);

  const handleLogout = async () => {
    try {
      await logoutUser();
      await auth.signOut().catch(() => undefined);
      toast.success("Çıkış yapıldı.");
      router.replace("/giris");
      router.refresh();
    } catch {
      toast.error("Çıkış yapılamadı.");
    }
  };

  return (
    <div className="dashboard-ui flex h-screen overflow-hidden [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer [&_input[type='checkbox']]:cursor-pointer [&_input[type='radio']]:cursor-pointer [&_label]:cursor-pointer **:[[role='button']]:cursor-pointer **:[[role='switch']]:cursor-pointer **:[[role='tab']]:cursor-pointer [&_summary]:cursor-pointer">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-dark text-white lg:flex">
        <SidebarContent
          pathname={pathname}
          user={user}
          onLogout={handleLogout}
        />
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
              user={user}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      )}

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto bg-bg-offwhite">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-4 bg-bg-offwhite px-4 sm:px-6 lg:h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark lg:hidden"
              aria-label="Menüyü aç"
            >
              <Menu className="size-5" strokeWidth={1.75} />
            </button>
            {isAnalysisDetail ? (
              <Link
                href="/dashboard/analizler"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark/50 transition-colors hover:text-brand-dark"
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
                Analizler
              </Link>
            ) : (
              <Link href="/dashboard" className="lg:hidden">
                <Logo className="h-6 w-auto text-brand-dark" />
              </Link>
            )}
          </div>

          <div className="ml-auto flex items-center">
            <button
              type="button"
              className="relative flex size-9 cursor-pointer items-center justify-center rounded-lg text-brand-dark/70 transition-colors hover:bg-brand-dark/5 hover:text-brand-dark"
              aria-label="Bildirimler"
            >
              <Bell className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
