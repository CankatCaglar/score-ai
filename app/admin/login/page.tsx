"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { adminLogin } from "@/actions/admin";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("E-posta ve şifre gerekli.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminLogin(email, password);
      if (result.ok) {
        toast.success("Giriş başarılı.");
        router.replace("/admin");
        router.refresh();
        return;
      }
      if (result.error === "CONFIG_MISSING") {
        toast.error("Admin bilgileri sunucuda tanımlı değil (.env.local).");
      } else {
        toast.error("E-posta veya şifre hatalı.");
      }
    } catch {
      toast.error("Bir sorun oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-brand-dark px-4 pt-14 pb-10 sm:items-center sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-8">
          <Logo className="h-8 w-auto text-white" />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-brand-neon">
            <ShieldCheck className="size-3.5" />
            Yönetim Paneli
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 shadow-2xl sm:p-8">
          <h1 className="text-xl font-semibold text-white">Admin Girişi</h1>
          <p className="mt-1 text-sm text-white/50">
            Devam etmek için yönetici bilgilerinizle giriş yapın.
          </p>

          <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-sm font-medium text-white/80"
              >
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-posta adresi"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 w-full rounded-xl border border-white/10 bg-brand-dark/60 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-sm font-medium text-white/80"
              >
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="off"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifre"
                  className="h-11 w-full rounded-xl border border-white/10 bg-brand-dark/60 pl-10 pr-11 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-brand-neon focus:ring-2 focus:ring-brand-neon/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-brand-neon text-sm font-bold text-brand-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-white/30">
          <Lock className="size-3" />
          Bu alan yalnızca yetkili yöneticiler içindir.
        </p>
      </div>
    </div>
  );
}
