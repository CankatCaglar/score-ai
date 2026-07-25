"use client";

import Link from "next/link";
import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthFeedback,
  AuthSubmitButton,
  AuthTextField,
} from "@/components/auth/AuthFormFields";
import { auth } from "@/lib/firebase";
import { getAppOrigin, mapAuthError } from "@/lib/auth/errors";

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    if (!email.trim()) {
      setFeedback("E-posta adresi gerekli.");
      return;
    }

    setLoading(true);
    try {
      const origin = getAppOrigin();
      // Güvenlik: kayıtlı olsun/olmasın aynı başarı mesajı
      await sendPasswordResetEmail(auth, email.trim(), {
        url: `${origin}/giris`,
        handleCodeInApp: false,
      }).catch(() => undefined);
      setSent(true);
    } catch (error) {
      setFeedback(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Şifrenizi mi unuttunuz?"
      subtitle="Kayıtlı e-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim."
      variant="simple"
      footer={
        <p className="text-center text-sm text-brand-dark/55">
          <Link
            href="/giris"
            className="font-semibold text-brand-dark underline-offset-2 hover:underline"
          >
            Giriş sayfasına dön
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-dark/10 bg-white px-4 py-3.5 text-sm leading-relaxed text-brand-dark/70">
            E-posta adresiniz sistemde kayıtlıysa sıfırlama bağlantısı
            gönderildi. Gelen kutusu ve spam klasörünü kontrol edin.
          </div>
          <Link
            href="/giris"
            className="flex h-11 items-center justify-center rounded-xl bg-brand-dark text-sm font-semibold text-white transition hover:opacity-90"
          >
            Girişe dön
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <AuthTextField
            id="reset-email"
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
          <AuthFeedback message={feedback} />
          <AuthSubmitButton loading={loading}>Gönder</AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
