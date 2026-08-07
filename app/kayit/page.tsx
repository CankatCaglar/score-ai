"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth");
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
    if (
      isSoftAuthFeedback(message) ||
      message === t("signup.passwordMismatch") ||
      message.includes("eşleşmiyor") ||
      message.includes("do not match")
    ) {
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
      setFeedback(t("signup.fieldsRequired"));
      return;
    }
    if (password.length < 6) {
      setFeedback(t("errors.weakPassword"));
      return;
    }
    if (password !== confirm) {
      setFeedback(t("signup.passwordMismatch"));
      return;
    }
    if (!acceptedTerms) {
      setFeedback(t("signup.termsRequired"));
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
      toast.success(t("signup.success"));
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
      toast.success(t("login.success"));
      router.replace(result.emailVerified ? next : "/email-dogrula");
      router.refresh();
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title={t("signup.title")}
      subtitle={t("signup.subtitle")}
      compact
      footer={
        <p className="text-center text-xs text-brand-dark/55 sm:text-sm">
          {t("signup.hasAccount")}{" "}
          <Link
            href={`/giris${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-brand-dark underline-offset-2 hover:underline"
          >
            {t("signup.loginLink")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <AuthTextField
          id="signup-name"
          label={t("signup.name")}
          value={name}
          onChange={(value) => {
            setName(value);
            if (feedback) setFeedback("");
          }}
          placeholder={t("signup.namePlaceholder")}
          autoComplete="name"
          icon={User}
          compact
        />
        <AuthTextField
          id="signup-email"
          label={t("signup.email")}
          type="email"
          value={email}
          onChange={(value) => {
            setEmail(value);
            if (feedback) setFeedback("");
          }}
          placeholder={t("signup.emailPlaceholder")}
          autoComplete="email"
          compact
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-1 sm:gap-5.5">
          <AuthPasswordField
            id="signup-password"
            label={t("signup.password")}
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (feedback) setFeedback("");
            }}
            autoComplete="new-password"
            placeholder={t("fields.passwordHint")}
            compact
          />
          <AuthPasswordField
            id="signup-confirm"
            label={t("signup.confirmPassword")}
            value={confirm}
            onChange={(value) => {
              setConfirm(value);
              if (feedback) setFeedback("");
            }}
            autoComplete="new-password"
            placeholder={t("signup.confirmPlaceholder")}
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
          label={t.rich("signup.terms", {
            terms: (chunks) => (
              <a
                href="/kullanim-kosullari"
                className="font-medium text-brand-dark underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a
                href="/gizlilik-politikasi"
                className="font-medium text-brand-dark underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {chunks}
              </a>
            ),
          })}
        />

        <AuthFeedback message={feedback} />
        <AuthSubmitButton loading={loading} disabled={!acceptedTerms} compact>
          {t("signup.submit")}
        </AuthSubmitButton>
      </form>

      <div className="mt-2 space-y-2.5 sm:mt-2.5 sm:space-y-3">
        <AuthDivider />
        <GoogleSignInButton
          onClick={handleGoogle}
          loading={googleLoading}
          label={t("signup.google")}
          compact
        />
      </div>
    </AuthShell>
  );
}

export default function KayitPage() {
  const t = useTranslations("auth");

  return (
    <Suspense
      fallback={
        <AuthShell title={t("signup.title")} subtitle={t("signup.loading")} compact>
          <div className="h-32 animate-pulse rounded-2xl bg-brand-dark/5" />
        </AuthShell>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
