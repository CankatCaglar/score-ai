"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Brain,
  ChevronDown,
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
import { Logo } from "@/components/Logo";
import { useClickOutside } from "@/hooks/useClickOutside";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { DashboardBackProvider } from "@/components/dashboard/DashboardBackContext";
import { DashboardHeaderBack } from "@/components/dashboard/DashboardHeaderBack";
import { flushProductTipQueue } from "@/lib/notifications/product-tips";

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

function ProfileAvatar({
  picture,
  initials,
  sizeClass,
  fallbackClassName,
}: {
  picture?: string;
  initials: string;
  sizeClass: string;
  fallbackClassName: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(picture) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [picture]);

  if (!showImage) {
    return (
      <div
        className={`flex items-center justify-center rounded-full ${sizeClass} ${fallbackClassName}`}
      >
        {initials}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={picture}
      alt=""
      referrerPolicy="no-referrer"
      className={`${sizeClass} rounded-full object-cover`}
      onError={() => setFailed(true)}
    />
  );
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

const HELP_CENTER_URL = "https://www.nerasocial.com/iletisim";

function ProfilePopup({
  user,
  onClose,
  onLogoutRequest,
}: {
  user: DashboardUser;
  onClose: () => void;
  onLogoutRequest: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 mx-2">
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <ProfileAvatar
                picture={user.picture}
                initials={user.initials}
                sizeClass="size-12 text-sm font-semibold"
                fallbackClassName="bg-brand-dark/10 text-brand-dark"
              />
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
          <a
            href={HELP_CENTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-dark/5"
          >
            <HelpCircle className="size-4 shrink-0 text-brand-dark/50" strokeWidth={1.75} />
            <div className="min-w-0 text-left">
              <p className="text-sm font-medium text-brand-dark">Yardım Merkezi</p>
              <p className="text-[11px] text-brand-dark/45">
                Destek ve iletişim
              </p>
            </div>
          </a>
        </div>

        <div className="border-t border-brand-dark/8 px-2 py-1.5">
          <button
            type="button"
            onClick={onLogoutRequest}
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
            onLogoutRequest={() => {
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
            <ProfileAvatar
              picture={user.picture}
              initials={user.initials}
              sizeClass="size-9 text-xs font-semibold"
              fallbackClassName="bg-white/15 text-white"
            />
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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const wasOnResultRef = useRef(false);

  useEffect(() => {
    const onResult = pathname.startsWith("/dashboard/analiz-sonucu");
    if (wasOnResultRef.current && !onResult) {
      // After leaving result page: show queued tips one-by-one
      // (completed toast is already gone / no longer competing).
      flushProductTipQueue({ delayMs: 500 });
    }
    wasOnResultRef.current = onResult;
  }, [pathname]);

  const requestLogout = () => {
    setMobileOpen(false);
    setLogoutConfirmOpen(true);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutUser();
      await auth.signOut().catch(() => undefined);
      toast.success("Çıkış yapıldı.");
      router.replace("/giris");
      router.refresh();
    } catch {
      toast.error("Çıkış yapılamadı.");
      setIsLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  };

  return (
    <DashboardBackProvider>
      <div className="dashboard-ui fixed inset-0 flex overflow-hidden bg-bg-offwhite [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer [&_input[type='checkbox']]:cursor-pointer [&_input[type='radio']]:cursor-pointer [&_label]:cursor-pointer **:[[role='button']]:cursor-pointer **:[[role='switch']]:cursor-pointer **:[[role='tab']]:cursor-pointer [&_summary]:cursor-pointer">
        <aside className="hidden h-full w-64 shrink-0 flex-col bg-brand-dark text-white lg:flex">
          <SidebarContent
            pathname={pathname}
            user={user}
            onLogout={requestLogout}
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
                onLogout={requestLogout}
              />
            </aside>
          </div>
        )}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain bg-bg-offwhite">
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
              <Suspense fallback={null}>
                <DashboardHeaderBack />
              </Suspense>
            </div>

            <div className="ml-auto flex items-center">
              <NotificationBell />
            </div>
          </header>

          <main className="min-w-0 flex-1 pb-[max(2rem,env(safe-area-inset-bottom))]">
            {children}
          </main>
        </div>

        {logoutConfirmOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 px-4"
            onClick={() => {
              if (!isLoggingOut) setLogoutConfirmOpen(false);
            }}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-bg-light p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <h2
                id="logout-confirm-title"
                className="text-lg font-semibold text-brand-dark"
              >
                Çıkış yapmak istediğinize emin misiniz?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-dark/65">
                Hesabınızdan güvenli şekilde çıkış yapılacak. Tekrar giriş yaparak
                kaldığınız yerden devam edebilirsiniz.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setLogoutConfirmOpen(false)}
                  className="rounded-lg border border-brand-dark/10 px-3.5 py-2 text-sm font-medium text-brand-dark/70 transition-colors hover:bg-brand-dark/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <LogOut className="size-4" strokeWidth={2} />
                  {isLoggingOut ? "Çıkış yapılıyor..." : "Evet, Çıkış Yap"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardBackProvider>
  );
}
