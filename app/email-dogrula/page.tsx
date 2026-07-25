"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { onAuthStateChanged, reload } from "firebase/auth";
import { toast } from "sonner";
import { logoutUser, refreshUserSession } from "@/actions/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { auth } from "@/lib/firebase";
import { resendVerificationEmail } from "@/lib/auth/client";

export default function EmailDogrulaPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setEmail(user?.email ?? null);
    });
    return () => unsub();
  }, []);

  const handleResend = async () => {
    setLoading(true);
    try {
      const result = await resendVerificationEmail();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Doğrulama e-postası yeniden gönderildi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        router.replace("/giris");
        return;
      }
      await reload(user);
      if (!user.emailVerified) {
        toast.message("Henüz doğrulanmadı", {
          description: "E-postadaki bağlantıya tıkladıktan sonra tekrar deneyin.",
        });
        return;
      }
      await refreshUserSession();
      toast.success("E-posta doğrulandı.");
      router.replace("/dashboard");
      router.refresh();
    } catch {
      toast.error("Doğrulama kontrolü başarısız.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    await auth.signOut().catch(() => undefined);
    router.replace("/giris");
    router.refresh();
  };

  return (
    <AuthShell
      title="E-postanızı doğrulayın"
      subtitle="Hesabınızı güvence altına almak için e-posta adresinizi doğrulamanız gerekiyor."
      variant="simple"
    >
      <div className="rounded-2xl border border-brand-dark/8 bg-white p-5 shadow-sm">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-neon/40 text-brand-dark">
          <MailCheck className="size-5" strokeWidth={1.75} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-brand-dark/70">
          {email ? (
            <>
              <span className="font-semibold text-brand-dark">{email}</span>{" "}
              adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan
              sonra aşağıdaki butonla devam edin.
            </>
          ) : (
            <>
              Doğrulama e-postasını kontrol edin. Bağlantıya tıkladıktan sonra
              buradan devam edebilirsiniz.
            </>
          )}
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-brand-dark text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? "Kontrol ediliyor…" : "Doğruladım, devam et"}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-brand-dark/12 bg-white text-sm font-semibold text-brand-dark transition hover:bg-brand-dark/3 disabled:opacity-50"
          >
            {loading ? "Gönderiliyor…" : "E-postayı yeniden gönder"}
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={handleLogout}
          className="font-medium text-brand-dark/50 transition hover:text-brand-dark"
        >
          Çıkış yap
        </button>
        <Link
          href="/giris"
          className="font-semibold text-brand-dark underline-offset-2 hover:underline"
        >
          Girişe dön
        </Link>
      </div>
    </AuthShell>
  );
}
