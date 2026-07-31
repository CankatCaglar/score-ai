"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { refreshUserSession } from "@/actions/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthFeedback,
  AuthPasswordField,
  AuthSubmitButton,
  PasswordRuleList,
} from "@/components/auth/AuthFormFields";
import { auth } from "@/lib/firebase";
import { mapAuthError } from "@/lib/auth/errors";

function passwordMeetsRules(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function getDashboard (){
  const data = await getDashboardData(uid);
  const cpData =
}

function AuthActionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [status, setStatus] = useState<"loading" | "ready" | "done" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("Bağlantı doğrulanıyor…");
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!mode || !oobCode) {
        if (!cancelled) {
          setStatus("error");
          setMessage("Geçersiz veya eksik doğrulama bağlantısı.");
        }
        return;
      }

      try {
        if (mode === "verifyEmail") {
          await applyActionCode(auth, oobCode);
          await refreshUserSession();
          if (!cancelled) {
            setStatus("done");
            setMessage("E-posta adresiniz doğrulandı.");
            toast.success("E-posta doğrulandı.");
            setTimeout(() => {
              router.replace("/dashboard");
              router.refresh();
            }, 1200);
          }
          return;
        }

        if (mode === "resetPassword") {
          const accountEmail = await verifyPasswordResetCode(auth, oobCode);
          if (!cancelled) {
            setEmail(accountEmail);
            setStatus("ready");
            setMessage("Lütfen yeni şifrenizi girin.");
          }
          return;
        }

        if (mode === "recoverEmail") {
          const info = await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          if (!cancelled) {
            setStatus("done");
            setMessage(
              `E-posta adresiniz ${info.data.email ?? ""} olarak geri alındı.`,
            );
          }
          return;
        }

        if (!cancelled) {
          setStatus("error");
          setMessage("Desteklenmeyen işlem türü.");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(mapAuthError(error));
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [mode, oobCode, router]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    if (!oobCode) return;

    if (!passwordMeetsRules(password)) {
      setFeedback("Lütfen tüm şifre kurallarını sağlayın.");
      return;
    }
    if (password !== confirm) {
      setFeedback("Şifreler eşleşmiyor. Lütfen kontrol edin.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus("done");
      setMessage("Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.");
      toast.success("Şifre güncellendi.");
    } catch (error) {
      setFeedback(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  if (mode === "resetPassword" && status === "done") {
    return (
      <AuthShell
        title="Şifreniz güncellendi!"
        subtitle="Yeni şifrenizle giriş yapabilirsiniz."
        variant="simple"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-brand-dark text-brand-neon">
            <CheckCircle2 className="size-8" strokeWidth={1.75} />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-brand-dark/60">
            {message}
          </p>
          <Link
            href="/giris"
            className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-brand-dark text-sm font-semibold text-white transition hover:opacity-90"
          >
            Giriş Yap
          </Link>
        </div>
      </AuthShell>
    );
  }

  const title =
    mode === "resetPassword"
      ? "Yeni şifre belirleyin"
      : mode === "verifyEmail"
        ? "E-posta doğrulama"
        : "Hesap işlemi";

  return (
    <AuthShell title={title} subtitle={message} variant="simple">
      {status === "loading" && (
        <div className="h-28 animate-pulse rounded-2xl bg-brand-dark/5" />
      )}

      {status === "ready" && mode === "resetPassword" && (
        <form onSubmit={handleReset} className="space-y-4">
          {email && (
            <p className="rounded-xl bg-brand-dark/4 px-3.5 py-2.5 text-sm text-brand-dark/70">
              Hesap: <span className="font-semibold text-brand-dark">{email}</span>
            </p>
          )}
          <AuthPasswordField
            id="new-password"
            label="Yeni Şifre"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (feedback) setFeedback("");
            }}
            autoComplete="new-password"
            placeholder="Yeni şifreniz"
          />
          <PasswordRuleList password={password} />
          <AuthPasswordField
            id="new-password-confirm"
            label="Yeni Şifre Tekrar"
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              if (feedback) setFeedback("");
            }}
            autoComplete="new-password"
            placeholder="Şifreyi tekrar girin"
          />
          <AuthFeedback message={feedback} />
          <AuthSubmitButton
            loading={loading}
            disabled={!passwordMeetsRules(password) || password !== confirm}
          >
            Şifreyi Güncelle
          </AuthSubmitButton>
        </form>
      )}

      {(status === "done" || status === "error") && mode !== "resetPassword" && (
        <div className="space-y-4">
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              status === "done"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
          <Link
            href="/giris"
            className="flex h-11 items-center justify-center rounded-xl bg-brand-dark text-sm font-semibold text-white transition hover:opacity-90"
          >
            Girişe git
          </Link>
        </div>
      )}

      {status === "error" && mode === "resetPassword" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
          </div>
          <Link
            href="/sifremi-unuttum"
            className="flex h-11 items-center justify-center rounded-xl bg-brand-dark text-sm font-semibold text-white transition hover:opacity-90"
          >
            Yeni bağlantı iste
          </Link>
        </div>
      )}
    </AuthShell>
  );
}

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Hesap işlemi" subtitle="Yükleniyor…" variant="simple">
          <div className="h-28 animate-pulse rounded-2xl bg-brand-dark/5" />
        </AuthShell>
      }
    >
      <AuthActionInner />
    </Suspense>
  );
}