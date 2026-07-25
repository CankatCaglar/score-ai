"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { User } from "lucide-react";
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
import { signInWithGoogle, signUpWithEmail } from "@/lib/auth/client";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

function markReturningUser() {
  try {
    localStorage.setItem("score_has_account", "1");
  } catch {
    // ignore
  }
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const showFeedback = (message: string) => {
    if (isSoftAuthFeedback(message) || message.includes("eşleşmiyor")) {
      setFeedback(message);
      return;
    }
    setFeedback("");
    toast.error(message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    if (!name.trim() || !email || !password) {
      setFeedback("Devam etmek için ad, e-posta ve şifre gerekli.");
      return;
    }
    if (password.length < 6) {
      setFeedback("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setFeedback("Şifreler eşleşmiyor. Lütfen kontrol edin.");
      return;
    }
    if (!acceptedTerms) {
      setFeedback("Devam etmek için kullanım koşullarını ve gizlilik politikasını kabul etmelisiniz.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUpWithEmail({ name, email, password });
      if (!result.ok) {
        showFeedback(result.error);
        return;
      }
      markReturningUser();
      toast.success("Hesap oluşturuldu. E-posta doğrulama bağlantısı gönderildi.");
      router.replace("/email-dogrula");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setFeedback("");
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle({ rememberMe: true });
      if (!result.ok) {
        showFeedback(result.error);
        return;
      }
      markReturningUser();
      toast.success("Giriş başarılı.");
      router.replace(result.emailVerified ? next : "/email-dogrula");
      router.refresh();
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Hesap oluşturun"
      subtitle="Score AI’ye katılın ve içeriklerinizi bir üst seviyeye taşıyın."
      compact
      footer={
        <p className="text-center text-xs text-brand-dark/55 sm:text-sm">
          Zaten hesabınız var mı?{" "}
          <Link
            href={`/giris${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-brand-dark underline-offset-2 hover:underline"
          >
            Giriş Yap
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <AuthTextField
          id="signup-name"
          label="Ad Soyad"
          value={name}
          onChange={(value) => {
            setName(value);
            if (feedback) setFeedback("");
          }}
          placeholder="Adınız Soyadınız"
          autoComplete="name"
          icon={User}
          compact
        />
        <AuthTextField
          id="signup-email"
          label="E-posta"
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            if (feedback) setFeedback("");
          }}
          placeholder="ornek@sirket.com"
          autoComplete="email"
          compact
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-1 sm:gap-5.5">
          <AuthPasswordField
            id="signup-password"
            label="Şifre"
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (feedback) setFeedback("");
            }}
            autoComplete="new-password"
            placeholder="En az 6 karakter"
            compact
          />
          <AuthPasswordField
            id="signup-confirm"
            label="Şifre Tekrar"
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              if (feedback) setFeedback("");
            }}
            autoComplete="new-password"
            placeholder="Tekrar"
            compact
          />
        </div>

        <AuthCheckbox
          id="signup-terms"
          checked={acceptedTerms}
          onChange={(checked) => {
            setAcceptedTerms(checked);
            if (feedback) setFeedback("");
          }}
          label={
            <>
              <a
                href="https://www.nerasocial.com/kullanim-kosullari"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-dark underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Kullanım koşullarını
              </a>{" "}
              ve{" "}
              <a
                href="https://www.nerasocial.com/gizlilik-politikasi"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-dark underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Gizlilik politikasını
              </a>{" "}
              okudum, kabul ediyorum.
            </>
          }
        />

        <AuthFeedback message={feedback} />
        <AuthSubmitButton loading={loading} disabled={!acceptedTerms} compact>
          Kayıt Ol
        </AuthSubmitButton>
      </form>

      <div className="mt-2 space-y-2.5 sm:mt-2.5 sm:space-y-3">
        <AuthDivider />
        <GoogleSignInButton
          onClick={handleGoogle}
          loading={googleLoading}
          label="Google ile kayıt ol"
          compact
        />
      </div>
    </AuthShell>
  );
}

export default function KayitPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Hesap oluşturun" subtitle="Yükleniyor…" compact>
          <div className="h-32 animate-pulse rounded-2xl bg-brand-dark/5" />
        </AuthShell>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
