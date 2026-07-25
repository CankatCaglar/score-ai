"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthCheckbox,
  AuthDivider,
  AuthFeedback,
  AuthPasswordField,
  AuthSubmitButton,
  AuthTextField,
  GoogleSignInButton,
} from "@/components/auth/AuthFormFields";
import { isSoftAuthFeedback } from "@/lib/auth/errors";
import { signInWithEmail, signInWithGoogle } from "@/lib/auth/client";

const RETURNING_KEY = "score_has_account";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

function markReturningUser() {
  try {
    localStorage.setItem(RETURNING_KEY, "1");
  } catch {
    // ignore
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    try {
      setReturning(localStorage.getItem(RETURNING_KEY) === "1");
    } catch {
      setReturning(false);
    }
  }, []);

  const finishAuth = (emailVerified: boolean) => {
    setFeedback("");
    markReturningUser();
    toast.success("Giriş başarılı.");
    if (!emailVerified) {
      router.replace("/email-dogrula");
    } else {
      router.replace(next);
    }
    router.refresh();
  };

  const showFeedback = (message: string) => {
    if (isSoftAuthFeedback(message)) {
      setFeedback(message);
      return;
    }
    setFeedback("");
    toast.error(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    if (!email || !password) {
      setFeedback("Devam etmek için e-posta ve şifrenizi girin.");
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEmail({ email, password, rememberMe });
      if (!result.ok) {
        showFeedback(result.error);
        return;
      }
      finishAuth(result.emailVerified);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setFeedback("");
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle({ rememberMe });
      if (!result.ok) {
        showFeedback(result.error);
        return;
      }
      finishAuth(result.emailVerified);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title={returning ? "Tekrar hoş geldiniz" : "Hoş geldiniz"}
      subtitle="Hesabınıza giriş yapın."
      footer={
        <p className="text-center text-sm text-brand-dark/55">
          Hesabınız yok mu?{" "}
          <Link
            href={`/kayit${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-brand-dark underline-offset-2 hover:underline"
          >
            Kayıt Ol
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthTextField
          id="login-email"
          label="E-posta"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            if (feedback) setFeedback("");
          }}
          placeholder="ornek@sirket.com"
          autoComplete="email"
        />
        <AuthPasswordField
          id="login-password"
          label="Şifre"
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (feedback) setFeedback("");
          }}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between gap-3">
          <AuthCheckbox
            id="remember-me"
            checked={rememberMe}
            onChange={setRememberMe}
            label="Beni hatırla"
          />
          <Link
            href="/sifremi-unuttum"
            className="text-sm font-medium text-brand-dark/60 transition hover:text-brand-dark"
          >
            Şifremi unuttum?
          </Link>
        </div>

        <AuthFeedback message={feedback} />
        <AuthSubmitButton loading={loading}>Giriş Yap</AuthSubmitButton>
      </form>

      <div className="mt-5 space-y-5">
        <AuthDivider />
        <GoogleSignInButton onClick={handleGoogle} loading={googleLoading} />
      </div>
    </AuthShell>
  );
}

export default function GirisPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Hoş geldiniz" subtitle="Yükleniyor…">
          <div className="h-40 animate-pulse rounded-2xl bg-brand-dark/5" />
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
