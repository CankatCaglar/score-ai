import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifySessionToken } from "@/lib/admin-auth";
import { AdminPanel } from "./AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  if (!session) {
    redirect("/admin/login");
  }

  return <AdminPanel adminEmail={session.sub} />;
}
