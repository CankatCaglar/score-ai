"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  Link2,
  Lock,
  Mail,
  MessageSquare,
  Shield,
  Smartphone,
  User,
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import { toast } from "sonner";
import {
  getCurrentUserProfile,
  updateCurrentUserPhoto,
  updateCurrentUserProfile,
} from "@/actions/profile";
import { changePassword } from "@/lib/auth/client";
import { auth } from "@/lib/firebase";
import {
  PROFILE_COUNTRIES,
  PROFILE_LANGUAGES,
  PROFILE_SECTORS,
  PROFILE_TIMEZONES,
  initialsFromProfile,
  type UserProfile,
} from "@/lib/user-profile";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useRouter } from "next/navigation";

type Tab = "profil" | "guvenlik" | "bildirimler" | "entegrasyonlar" | "fatura";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profil", label: "Profil", icon: User },
  { id: "guvenlik", label: "Güvenlik", icon: Lock },
  { id: "bildirimler", label: "Bildirimler", icon: Bell },
  { id: "entegrasyonlar", label: "Entegrasyonlar", icon: Link2 },
  { id: "fatura", label: "Fatura ve Plan", icon: CreditCard },
];

// ─── Custom Select ────────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Seçin",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    if (!open || !ref.current) return;
    ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-brand-dark/70">{label}</label>
      <div ref={ref} className={`relative ${open ? "z-50" : "z-10"}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-brand-dark/12 bg-white px-3.5 py-2.5 text-sm text-brand-dark transition-colors hover:border-brand-dark/25 focus:outline-none"
        >
          <span className={value ? "text-brand-dark" : "text-brand-dark/35"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-brand-dark/40 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            strokeWidth={1.75}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-brand-dark/10 bg-white py-1 shadow-lg shadow-brand-dark/8">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brand-dark/45 transition-colors hover:bg-brand-dark/5"
            >
              {placeholder}
            </button>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-brand-dark/5 ${
                  value === opt
                    ? "bg-brand-dark/4 font-medium text-brand-dark"
                    : "text-brand-dark/70"
                }`}
              >
                <span className="flex-1">{opt}</span>
                {value === opt && (
                  <Check className="size-3.5 shrink-0 text-brand-dark" strokeWidth={2.5} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Input / Password ─────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  type = "text",
  hint,
  placeholder,
  disabled,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-brand-dark/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className="w-full rounded-xl border border-brand-dark/12 bg-white px-3.5 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/30 transition-colors focus:border-brand-dark/30 focus:outline-none disabled:cursor-not-allowed disabled:bg-brand-dark/4 disabled:text-brand-dark/60 read-only:bg-brand-dark/4"
      />
      {hint && (
        <p className="flex items-center gap-1 text-xs text-green-600">
          <Check className="size-3.5" strokeWidth={2.5} />
          {hint}
        </p>
      )}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);

  const isStrong =
    value.length > 8 &&
    /[A-Z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-brand-dark/70">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-brand-dark/12 bg-white px-3.5 py-2.5 pr-10 text-sm text-brand-dark transition-colors focus:border-brand-dark/30 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-brand-dark/40 hover:text-brand-dark/70"
        >
          {show ? (
            <EyeOff className="size-4" strokeWidth={1.75} />
          ) : (
            <Eye className="size-4" strokeWidth={1.75} />
          )}
        </button>
      </div>
      {label === "Yeni Şifre" && value.length > 4 && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-dark/10">
            <div
              className={`h-full rounded-full transition-all ${
                isStrong ? "w-full bg-green-500" : "w-1/2 bg-yellow-400"
              }`}
            />
          </div>
          <p className={`text-xs ${isStrong ? "text-green-600" : "text-brand-dark/50"}`}>
            {isStrong
              ? "Güçlü şifre: büyük harf, sayı ve sembol içeriyor"
              : "Orta güç: daha güvenli bir şifre oluşturun"}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-brand-neon" : "bg-brand-dark/20"
      }`}
    >
      <span
        className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Profil Tab ───────────────────────────────────────────────────────────────

function ProfilTab() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [sector, setSector] = useState("");
  const [language, setLanguage] = useState("");
  const [timezone, setTimezone] = useState("");
  const [country, setCountry] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getCurrentUserProfile();
        if (cancelled) return;
        if (!data) {
          toast.error("Profil yüklenemedi. Lütfen tekrar giriş yapın.");
          return;
        }
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setCompany(data.company);
        setSector(data.sector);
        setLanguage(data.language);
        setTimezone(data.timezone);
        setCountry(data.country);
      } catch {
        if (!cancelled) toast.error("Profil yüklenirken bir hata oluştu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const initials = profile
    ? initialsFromProfile({
        ...profile,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim() || profile.displayName,
      })
    : "SC";

  const displayPhoto = photoPreview || profile?.photoURL || null;

  const handlePhotoPick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const allowed =
      /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type) ||
      /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    if (!allowed) {
      toast.error("Yalnızca PNG, JPEG, JPG, WEBP veya GIF yükleyebilirsiniz.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Görsel en fazla 5 MB olabilir.");
      return;
    }

    if (photoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        const photoResult = await updateCurrentUserPhoto(formData);
        if (!photoResult.ok || !photoResult.profile) {
          toast.error(photoResult.error ?? "Profil fotoğrafı kaydedilemedi.");
          return;
        }
        setProfile(photoResult.profile);
        if (photoPreview?.startsWith("blob:")) {
          URL.revokeObjectURL(photoPreview);
        }
        setPhotoFile(null);
        setPhotoPreview(null);
      }

      const result = await updateCurrentUserProfile({
        firstName,
        lastName,
        company,
        sector,
        language,
        timezone,
        country,
      });
      if (!result.ok || !result.profile) {
        toast.error(result.error ?? "Profil kaydedilemedi.");
        return;
      }
      setProfile(result.profile);
      toast.success("Profil bilgileriniz kaydedildi.");
      router.refresh();
    } catch {
      toast.error("Profil kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-brand-dark/5" />
        <div className="h-16 w-16 animate-pulse rounded-full bg-brand-dark/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-brand-dark/5" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-dark">Profil Bilgileri</h2>
        <p className="mt-0.5 text-sm text-brand-dark/50">
          Hesabınızı ve marka bilgilerinizi güncelleyin.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {displayPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayPhoto}
              alt=""
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full bg-brand-dark/10 text-base font-semibold text-brand-dark">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={handlePhotoPick}
            className="absolute -bottom-1 -right-1 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-brand-dark text-white transition-colors hover:bg-brand-dark/80"
            aria-label="Profil fotoğrafı değiştir"
          >
            <Camera className="size-3" strokeWidth={2} />
          </button>
        </div>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handlePhotoPick}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-brand-dark/15 bg-white px-4 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-dark/5"
          >
            <Camera className="size-4 shrink-0" strokeWidth={1.75} />
            <span>Fotoğraf Değiştir</span>
          </button>
          <p className="text-xs text-brand-dark/45">
            PNG, JPEG, JPG veya WEBP · en fazla 5 MB
          </p>
          {photoFile && (
            <p className="text-xs text-brand-dark/55">
              Yeni fotoğraf seçildi — kaydettikten sonra kalıcı olur.
            </p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
          className="hidden"
          onChange={handlePhotoChange}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField
          label="Ad"
          value={firstName}
          onChange={setFirstName}
          placeholder="Adınız"
        />
        <InputField
          label="Soyad"
          value={lastName}
          onChange={setLastName}
          placeholder="Soyadınız"
        />
        <div className="sm:col-span-2">
          <InputField
            label="E-posta"
            value={profile?.email ?? ""}
            readOnly
            hint={
              profile?.emailVerified
                ? "E-posta adresiniz doğrulandı"
                : undefined
            }
          />
          {profile && !profile.emailVerified && (
            <p className="mt-1 text-xs text-amber-600">
              E-posta adresiniz henüz doğrulanmadı.
            </p>
          )}
        </div>
        <div className="sm:col-span-2">
          <InputField
            label="Şirket"
            value={company}
            onChange={setCompany}
            placeholder="Şirket veya marka adı"
          />
        </div>
        <SelectField
          label="Sektör"
          value={sector}
          onChange={setSector}
          options={[...PROFILE_SECTORS]}
          placeholder="Sektör seçin"
        />
        <SelectField
          label="Dil"
          value={language}
          onChange={setLanguage}
          options={[...PROFILE_LANGUAGES]}
          placeholder="Dil seçin"
        />
        <SelectField
          label="Saat Dilimi"
          value={timezone}
          onChange={setTimezone}
          options={[...PROFILE_TIMEZONES]}
          placeholder="Saat dilimi seçin"
        />
        <SelectField
          label="Ülke"
          value={country}
          onChange={setCountry}
          options={[...PROFILE_COUNTRIES]}
          placeholder="Ülke seçin"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer rounded-xl bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </div>
  );
}

// ─── Güvenlik Tab ─────────────────────────────────────────────────────────────

function TwoFactorSection() {
  const [enabled, setEnabled] = useState(true);
  const [method, setMethod] = useState<"authenticator" | "sms" | "email">(
    "authenticator"
  );

  const methods = [
    {
      id: "authenticator" as const,
      icon: Shield,
      label: "Authenticator",
      desc: "Google Authenticator veya benzeri uygulama",
    },
    {
      id: "sms" as const,
      icon: Smartphone,
      label: "SMS",
      desc: "Kayıtlı telefon numarasına kod gönderilir",
    },
    {
      id: "email" as const,
      icon: Mail,
      label: "E-posta",
      desc: "Doğrulama kodu e-posta adresine gönderilir",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl bg-brand-dark/3 px-3.5 py-3">
        <div>
          <p className="text-sm font-medium text-brand-dark">
            {enabled ? "Doğrulama açık" : "Doğrulama kapalı"}
          </p>
          {enabled && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-green-600">
              <Check className="size-3" strokeWidth={2.5} />
              Girişlerde ek doğrulama istenecek
            </p>
          )}
        </div>
        <Toggle enabled={enabled} onChange={setEnabled} />
      </div>

      <p className="text-xs font-medium text-brand-dark/50">Doğrulama Yöntemi</p>
      <div className="space-y-2">
        {methods.map(({ id, icon: Icon, label, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMethod(id)}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
              method === id
                ? "border-brand-dark/20 bg-brand-dark/3"
                : "border-brand-dark/8 bg-white hover:bg-brand-dark/3"
            }`}
          >
            <Icon className="size-4 shrink-0 text-brand-dark/50" strokeWidth={1.75} />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-dark">{label}</p>
              <p className="text-xs text-brand-dark/50">{desc}</p>
            </div>
            <div
              className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                method === id ? "border-brand-dark bg-brand-dark" : "border-brand-dark/25"
              }`}
            >
              {method === id && (
                <div className="size-1.5 rounded-full bg-white" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          className="cursor-pointer rounded-xl bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          Doğrulama Ayarlarını Kaydet
        </button>
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordUser, setIsPasswordUser] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setIsPasswordUser(true);
        return;
      }
      setIsPasswordUser(
        user.providerData.some((p) => p.providerId === "password"),
      );
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Mevcut ve yeni şifre gerekli.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yeni şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Şifreniz güncellendi.");
    } finally {
      setLoading(false);
    }
  };

  if (!isPasswordUser) {
    return (
      <div className="rounded-2xl border border-brand-dark/8 bg-white p-5">
        <h3 className="font-semibold text-brand-dark">Şifre Değiştir</h3>
        <p className="mt-2 text-sm text-brand-dark/55">
          Bu hesap Google ile bağlandı. Şifre yönetimi Google hesabınız
          üzerinden yapılır.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-dark/8 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-brand-dark">Şifre Değiştir</h3>
          <p className="mt-0.5 text-xs text-brand-dark/50">
            Güvenliğiniz için mevcut şifrenizi doğrulayın.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
          Aktif
        </span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <PasswordField
          label="Mevcut Şifre"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />
        <PasswordField
          label="Yeni Şifre"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <PasswordField
          label="Yeni Şifre Tekrarı"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer rounded-xl bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Güncelleniyor…" : "Şifreyi Güncelle"}
          </button>
        </div>
      </form>
    </div>
  );
}

function GuvenlikTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-dark">Güvenlik Ayarları</h2>
        <p className="mt-0.5 text-sm text-brand-dark/50">
          Şifrenizi güncelleyin ve iki aşamalı doğrulama yönteminizi yönetin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChangePasswordSection />

        <div className="rounded-2xl border border-brand-dark/8 bg-white p-5">
          <h3 className="mb-1 font-semibold text-brand-dark">İki Aşamalı Doğrulama</h3>
          <p className="mb-4 text-xs text-brand-dark/50">
            Hesaba girişlerde ikinci bir doğrulama adımı kullanın.
          </p>
          <TwoFactorSection />
        </div>
      </div>
    </div>
  );
}

// ─── Bildirimler Tab ──────────────────────────────────────────────────────────

type NotifKey = "email" | "app" | "analiz" | "guvenlik" | "anlik" | "durum";

function NotifRow({
  icon: Icon,
  label,
  desc,
  enabled,
  onChange,
}: {
  icon: typeof Bell;
  label: string;
  desc: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-brand-dark/3 px-3.5 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-dark/8">
        <Icon className="size-4 text-brand-dark/60" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-brand-dark">{label}</p>
        <p className="text-xs text-brand-dark/50">{desc}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

function BildirimlerTab() {
  const [notifs, setNotifs] = useState<Record<NotifKey, boolean>>({
    email: true,
    app: true,
    analiz: true,
    guvenlik: true,
    anlik: true,
    durum: true,
  });

  const toggle = (key: NotifKey) =>
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-dark">Bildirim Ayarları</h2>
        <p className="mt-0.5 text-sm text-brand-dark/50">
          E-posta ve uygulama bildirim tercihlerinizi yönetin.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-dark/8 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-dark">E-posta Bildirimleri</h3>
              <p className="mt-0.5 text-xs text-brand-dark/50">
                Önemli güncellemeler e-posta adresinize gönderilir.
              </p>
            </div>
            <Toggle enabled={notifs.email} onChange={() => toggle("email")} />
          </div>
          <div className="space-y-3">
            <NotifRow
              icon={Mail}
              label="Analiz sonuçları"
              desc="Rapor hazır olduğunda e-posta gönderilir."
              enabled={notifs.analiz}
              onChange={() => toggle("analiz")}
            />
            <NotifRow
              icon={Shield}
              label="Güvenlik uyarıları"
              desc="Kritik hesap hareketlerinde uyarı alınır."
              enabled={notifs.guvenlik}
              onChange={() => toggle("guvenlik")}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-brand-dark/8 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-brand-dark">Uygulama Bildirimleri</h3>
              <p className="mt-0.5 text-xs text-brand-dark/50">
                Platform içi uyarılar ve anlık bilgilendirmeler gösterilir.
              </p>
            </div>
            <Toggle enabled={notifs.app} onChange={() => toggle("app")} />
          </div>
          <div className="space-y-3">
            <NotifRow
              icon={Bell}
              label="Anlık uyarılar"
              desc="Önemli gelişmeler uygulama içinde görünür."
              enabled={notifs.anlik}
              onChange={() => toggle("anlik")}
            />
            <NotifRow
              icon={MessageSquare}
              label="Analiz durumu"
              desc="Analiz başladığında ve tamamlandığında bildirilir."
              enabled={notifs.durum}
              onChange={() => toggle("durum")}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="cursor-pointer rounded-xl bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          Bildirimleri Kaydet
        </button>
      </div>
    </div>
  );
}

// ─── Entegrasyonlar Tab ───────────────────────────────────────────────────────

type IntegrationId = "canva" | "facebook" | "instagram" | "linkedin";

type Integration = {
  id: IntegrationId;
  name: string;
  desc: string;
  connected: boolean;
  meta: string;
};

function IntegrationIcon({ id }: { id: IntegrationId }) {
  if (id === "canva") {
    return (
      <span
        className="inline-flex size-10 items-center justify-center"
        aria-hidden="true"
      >
        <img
          src="/brands/canva/canva-icon-logo.svg"
          alt=""
          className="size-10"
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }

  const iconMap = {
    facebook: {
      IconComponent: FaFacebookF,
      wrapperClass: "bg-[#1877F2] text-white",
    },
    instagram: {
      IconComponent: FaInstagram,
      wrapperClass:
        "bg-[linear-gradient(135deg,#FEDA75_0%,#FA7E1E_25%,#D62976_55%,#962FBF_80%,#4F5BD5_100%)] text-white",
    },
    linkedin: {
      IconComponent: FaLinkedinIn,
      wrapperClass: "bg-[#0A66C2] text-white",
    },
  } as const;

  const config = iconMap[id];

  return (
    <span
      className={`inline-flex size-10 items-center justify-center rounded-full ${config.wrapperClass}`}
      aria-hidden="true"
    >
      <config.IconComponent className="size-5" />
    </span>
  );
}

const integrations: Integration[] = [
  {
    id: "canva",
    name: "Canva",
    desc: "Önerilen tasarımları Canva'da açıp düzenleyin.",
    connected: true,
    meta: "Son eşitleme: bugün",
  },
  {
    id: "facebook",
    name: "Facebook",
    desc: "Sayfa içeriklerini ve reklam kreatiflerini analiz edin.",
    connected: false,
    meta: "Meta hesabı gerekir",
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Gönderi ve Reels içerikleri için skor takibi yapın.",
    connected: false,
    meta: "Business/Creator · Facebook gerekmez",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    desc: "Şirket sayfası içeriklerini puanlayın ve iyileştirin.",
    connected: true,
    meta: "Nera Digital sayfası",
  },
];

function EntegrasyonlarTab() {
  const [items, setItems] = useState(integrations);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState<string | null>(null);
  const [instagramConfigured, setInstagramConfigured] = useState(false);
  const [instagramBusy, setInstagramBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/integrations/instagram");
        if (!res.ok) return;
        const data = (await res.json()) as {
          integrations?: {
            instagram?: {
              connected?: boolean;
              username?: string | null;
              configured?: boolean;
            };
          };
          configured?: boolean;
        };
        if (cancelled) return;
        setInstagramConnected(Boolean(data.integrations?.instagram?.connected));
        setInstagramUsername(data.integrations?.instagram?.username ?? null);
        setInstagramConfigured(
          Boolean(data.configured ?? data.integrations?.instagram?.configured),
        );
      } catch {
        // keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleConnection = (id: string) => {
    if (id === "instagram") return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, connected: !item.connected } : item
      )
    );
  };

  const handleInstagramConnect = async () => {
    setInstagramBusy(true);
    try {
      if (instagramConnected) {
        const res = await fetch("/api/dashboard/integrations/instagram", {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("disconnect failed");
        setInstagramConnected(false);
        setInstagramUsername(null);
        toast.success("Instagram bağlantısı kaldırıldı");
        return;
      }

      const res = await fetch("/api/dashboard/integrations/instagram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          returnTo: "/dashboard/ayarlar?tab=entegrasyonlar",
        }),
      });
      const data = (await res.json()) as {
        authorizeUrl?: string;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.authorizeUrl) {
        toast.error(
          data.message ||
            "Instagram Login yapılandırılmamış. Env / Meta App ayarlarını kontrol et.",
        );
        return;
      }
      window.location.assign(data.authorizeUrl);
    } catch {
      toast.error("Instagram bağlantısı güncellenemedi");
    } finally {
      setInstagramBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-dark">Entegrasyonlar</h2>
        <p className="mt-0.5 text-sm text-brand-dark/50">
          İçerik ve sosyal medya araçlarınızı ScoreAI ile bağlayın.
        </p>
      </div>

      <div>
        <p className="mb-1 text-sm font-semibold text-brand-dark">
          Bağlanabilir Uygulamalar
        </p>
        <p className="mb-4 text-xs text-brand-dark/50">
          İlk aşamada temel tasarım ve sosyal medya bağlantıları.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const isInstagram = item.id === "instagram";
            const connected = isInstagram ? instagramConnected : item.connected;
            const meta = isInstagram
              ? connected
                ? instagramUsername
                  ? `@${instagramUsername}`
                  : "Bağlı"
                : instagramConfigured
                  ? "Instagram Login ile doğrula"
                  : "Instagram Login yapılandırılmamış"
              : item.meta;

            return (
              <div
                key={item.id}
                className="flex flex-col rounded-2xl border border-brand-dark/8 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="pointer-events-none shrink-0 select-none">
                    <IntegrationIcon id={item.id} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-brand-dark">
                        {item.name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          connected
                            ? "bg-green-100 text-green-700"
                            : "bg-brand-dark/8 text-brand-dark/50"
                        }`}
                      >
                        {connected ? "Bağlı" : "Bağlı Değil"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-brand-dark/50">
                      {item.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-brand-dark/40">{meta}</p>
                  <button
                    type="button"
                    disabled={isInstagram && instagramBusy}
                    onClick={() =>
                      isInstagram ? void handleInstagramConnect() : toggleConnection(item.id)
                    }
                    className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                      connected
                        ? "border border-brand-dark/15 bg-white text-brand-dark hover:bg-brand-dark/5"
                        : "bg-brand-neon text-brand-dark hover:opacity-90"
                    }`}
                  >
                    {isInstagram
                      ? connected
                        ? "Kopar"
                        : instagramBusy
                          ? "..."
                          : "Bağla"
                      : connected
                        ? "Yönet"
                        : "Bağla"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Fatura ve Plan Tab ───────────────────────────────────────────────────────

function FaturaVePlanTab() {
  const plan = ((): "normal" | "pro" => "normal")();
  const isPro = plan === "pro";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-brand-dark">Fatura ve Plan</h2>
        <p className="mt-0.5 text-sm text-brand-dark/50">
          Abonelik ve ödeme bilgilerinizi yönetin.
        </p>
      </div>

      <div className="rounded-2xl border border-brand-dark/8 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-dark/45">
              Mevcut plan
            </p>
            <p className="mt-1 text-xl font-semibold text-brand-dark">
              {isPro ? "Pro" : "Normal"}
            </p>
            <p className="mt-1 text-sm text-brand-dark/50">
              {isPro
                ? "Gelişmiş analiz araçları ve öncelikli destek dahil."
                : "Temel analiz özellikleri aktif."}
            </p>
          </div>
          {!isPro && (
            <button
              type="button"
              className="cursor-pointer rounded-xl bg-brand-neon px-4 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
            >
              Pro&apos;ya yükselt
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-brand-dark/8 bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-dark/8">
            <CreditCard className="size-4 text-brand-dark/60" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-semibold text-brand-dark">Ödeme bilgileri</h3>
            <p className="mt-0.5 text-xs text-brand-dark/50">
              Kayıtlı kart ve fatura geçmişiniz burada görünecek.
            </p>
          </div>
        </div>
        <p className="rounded-xl bg-brand-dark/3 px-3.5 py-3 text-sm text-brand-dark/55">
          Henüz kayıtlı bir ödeme yöntemi yok.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AyarlarPage() {
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "profil";
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (
      tab === "profil" ||
      tab === "guvenlik" ||
      tab === "bildirimler" ||
      tab === "entegrasyonlar" ||
      tab === "fatura"
    ) {
      return tab;
    }
    if (params.get("instagram") === "connected") return "entegrasyonlar";
    return "profil";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("instagram");
    if (!flag) return;

    const posts = Number(params.get("posts") || "0");
    const postsWarning = params.get("posts_warning");
    const igUser = params.get("ig_user");

    if (flag === "connected") {
      if (postsWarning === "low" || (posts > 0 && posts < 6)) {
        toast.message(
          igUser
            ? `@${igUser} bağlandı · ${posts} içerik alındı`
            : `Instagram bağlandı · ${posts} içerik alındı`,
          {
            description:
              "Analiz için en az 6 içerik önerilir. Eksik kalanları manuel yükleyebilirsin.",
          },
        );
      } else if (postsWarning === "none" || posts === 0) {
        toast.message("Instagram hesabı bağlandı", {
          description:
            "Henüz içerik çekilemedi. 6–12 görsel/video manuel yükleyebilirsin.",
        });
      } else {
        toast.success(
          igUser
            ? `@${igUser} bağlandı · ${posts} içerik alındı`
            : `Instagram bağlandı · ${posts} içerik alındı`,
        );
      }
    } else if (flag === "denied") {
      toast.error("Instagram bağlantısı iptal edildi");
    } else if (flag === "error") {
      toast.error("Instagram bağlantısı başarısız");
    }

    window.history.replaceState({}, "", "/dashboard/ayarlar?tab=entegrasyonlar");
  }, []);

  return (
    <div className="px-4 pb-40 pt-2 sm:px-6 lg:px-8 lg:pb-48 lg:pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-dark lg:text-3xl">
          Ayarlar
        </h1>
        <p className="mt-1 text-sm text-brand-dark/50">
          Hesap ve platform ayarlarınızı yönetin.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav className="flex shrink-0 gap-1 overflow-x-auto rounded-2xl border border-brand-dark/8 bg-white p-2 lg:w-48 lg:flex-col lg:overflow-x-visible">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors lg:w-full ${
                activeTab === id
                  ? "bg-brand-dark/8 text-brand-dark"
                  : "text-brand-dark/55 hover:bg-brand-dark/5 hover:text-brand-dark"
              }`}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </nav>

        <div className="relative z-0 min-w-0 flex-1 overflow-visible rounded-2xl border border-brand-dark/8 bg-white p-5 sm:p-6">
          {activeTab === "profil" && <ProfilTab />}
          {activeTab === "guvenlik" && <GuvenlikTab />}
          {activeTab === "bildirimler" && <BildirimlerTab />}
          {activeTab === "entegrasyonlar" && <EntegrasyonlarTab />}
          {activeTab === "fatura" && <FaturaVePlanTab />}
        </div>
      </div>
    </div>
  );
}
