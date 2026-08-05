"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
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
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("");
    if (!email.trim()) {
      setFeedback(t("forgot.emailRequired"));
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
      setFeedback(mapAuthError(error, locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("forgot.title")}
      subtitle={t("forgot.subtitle")}
      variant="simple"
      footer={
        <p className="text-center text-sm text-brand-dark/55">
          <Link
            href="/giris"
            className="font-semibold text-brand-dark underline-offset-2 hover:underline"
          >
            {t("forgot.backToLogin")}
          </Link>
        </p>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-dark/10 bg-white px-4 py-3.5 text-sm leading-relaxed text-brand-dark/70">
            {t("forgot.success")}
          </div>
          <Link
            href="/giris"
            className="flex h-11 items-center justify-center rounded-xl bg-brand-dark text-sm font-semibold text-white transition hover:opacity-90"
          >
            {t("forgot.backToLoginShort")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <AuthTextField
            id="reset-email"
            label={t("forgot.email")}
            type="email"
            value={email}
            onChange={(value) => {
              setEmail(value);
              if (feedback) setFeedback("");
            }}
            placeholder={t("forgot.emailPlaceholder")}
            autoComplete="email"
          />
          <AuthFeedback message={feedback} />
          <AuthSubmitButton loading={loading}>{t("forgot.submit")}</AuthSubmitButton>
        </form>
      )}
    </AuthShell>
  );
}
