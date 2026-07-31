import { getCurrentUserSession } from "@/actions/auth";
import { getCurrentUserProfile } from "@/actions/profile";
import { getCurrentDashboardUserEmail } from "@/lib/analysis/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { touchUserActivity } from "@/lib/mail/engagement";
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

  if (email && !email.endsWith("@score.local")) {
    void touchUserActivity(email).catch(() => {
      // activity touch must not block dashboard render
    });
  }

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
