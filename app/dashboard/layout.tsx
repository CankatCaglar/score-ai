import { getCurrentUserSession } from "@/actions/auth";
import { getCurrentUserProfile } from "@/actions/profile";
import { getCurrentDashboardUserEmail } from "@/lib/analysis/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { initialsFromProfile } from "@/lib/user-profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, profile, fallbackEmail] = await Promise.all([
    getCurrentUserSession(),
    getCurrentUserProfile(),
    getCurrentDashboardUserEmail(),
  ]);

  const email =
    profile?.email ?? session?.email ?? fallbackEmail ?? "kullanici@score.local";
  const name =
    profile?.displayName?.trim() ||
    session?.name?.trim() ||
    email.split("@")[0] ||
    "Kullanıcı";
  const initials = profile
    ? initialsFromProfile(profile)
    : (name.slice(0, 2) || "SC").toUpperCase();

  return (
    <DashboardShell
      user={{
        email,
        name,
        initials,
        picture: profile?.photoURL ?? session?.picture,
      }}
    >
      {children}
    </DashboardShell>
  );
}
