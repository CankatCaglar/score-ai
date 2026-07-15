"use client";

import { useRef, useState } from "react";
import {
  Bell,
  Camera,
  Check,
  ChevronDown,
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
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import { useClickOutside } from "@/hooks/useClickOutside";

type Tab = "profil" | "guvenlik" | "bildirimler" | "entegrasyonlar";

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: "profil", label: "Profil", icon: User },
  { id: "guvenlik", label: "Güvenlik", icon: Lock },
  { id: "bildirimler", label: "Bildirimler", icon: Bell },
  { id: "entegrasyonlar", label: "Entegrasyonlar", icon: Link2 },
];

// ─── Custom Select ────────────────────────────────────────────────────────────

function SelectField({
  label,
  value: defaultValue,
  options,
}: {
  label: string;
  value: string;
  options: string[];
}) {
  const [selected, setSelected] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-brand-dark/70">{label}</label>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-brand-dark/12 bg-white px-3.5 py-2.5 text-sm text-brand-dark transition-colors hover:border-brand-dark/25 focus:outline-none"
        >
          <span>{selected}</span>
          <ChevronDown
            className={`size-4 shrink-0 text-brand-dark/40 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
            strokeWidth={1.75}
          />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-brand-dark/10 bg-white shadow-lg shadow-brand-dark/8">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  setSelected(opt);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-brand-dark/5 ${
                  selected === opt
                    ? "bg-brand-dark/4 font-medium text-brand-dark"
                    : "text-brand-dark/70"
                }`}
              >
                <span className="flex-1">{opt}</span>
                {selected === opt && (
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
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-brand-dark/70">{label}</label>
      <input
        defaultValue={value}
        type={type}
        className="w-full rounded-xl border border-brand-dark/12 bg-white px-3.5 py-2.5 text-sm text-brand-dark placeholder:text-brand-dark/30 transition-colors focus:border-brand-dark/30 focus:outline-none"
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

function PasswordField({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("••••••••••");

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
          onChange={(e) => setValue(e.target.value)}
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
          <div className="flex size-16 items-center justify-center rounded-full bg-brand-dark/10 text-base font-semibold text-brand-dark">
            EA
          </div>
          <button
            type="button"
            className="absolute -bottom-1 -right-1 flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-brand-dark text-white transition-colors hover:bg-brand-dark/80"
          >
            <Camera className="size-3" strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-dark/15 bg-white px-4 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-dark/5"
        >
          <Camera className="size-4" strokeWidth={1.75} />
          Fotoğraf Değiştir
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputField label="Ad" value="Ece" />
        <InputField label="Soyad" value="Aksoy" />
        <div className="sm:col-span-2">
          <InputField
            label="E-posta"
            value="ece.aksoy@example.com"
            hint="E-posta adresiniz doğrulandı"
          />
        </div>
        <div className="sm:col-span-2">
          <InputField label="Şirket" value="Nera Digital" />
        </div>
        <SelectField
          label="Sektör"
          value="Pazarlama Ajansı"
          options={["Pazarlama Ajansı", "E-ticaret", "SaaS", "Medya", "Diğer"]}
        />
        <SelectField
          label="Dil"
          value="Türkçe"
          options={["Türkçe", "English", "Deutsch"]}
        />
        <SelectField
          label="Saat Dilimi"
          value="(GMT+03:00) İstanbul"
          options={[
            "(GMT+03:00) İstanbul",
            "(GMT+00:00) London",
            "(GMT-05:00) New York",
          ]}
        />
        <SelectField
          label="Ülke"
          value="Türkiye"
          options={["Türkiye", "Almanya", "Amerika"]}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="cursor-pointer rounded-xl bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
        >
          Değişiklikleri Kaydet
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
        <div className="rounded-2xl border border-brand-dark/8 bg-white p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-brand-dark">Şifre Değiştir</h3>
              <p className="mt-0.5 text-xs text-brand-dark/50">
                Son güncelleme: 42 gün önce yapıldı.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
              Aktif
            </span>
          </div>
          <div className="space-y-3.5">
            <PasswordField label="Mevcut Şifre" />
            <PasswordField label="Yeni Şifre" />
            <PasswordField label="Yeni Şifre Tekrarı" />
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="cursor-pointer rounded-xl bg-brand-neon px-5 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90"
              >
                Şifreyi Güncelle
              </button>
            </div>
          </div>
        </div>

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
    meta: "Profesyonel hesap gerekir",
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

  const toggleConnection = (id: string) =>
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, connected: !item.connected } : item
      )
    );

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
          {items.map((item) => (
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
                        item.connected
                          ? "bg-green-100 text-green-700"
                          : "bg-brand-dark/8 text-brand-dark/50"
                      }`}
                    >
                      {item.connected ? "Bağlı" : "Bağlı Değil"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-dark/50">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-brand-dark/40">{item.meta}</p>
                <button
                  type="button"
                  onClick={() => toggleConnection(item.id)}
                  className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                    item.connected
                      ? "border border-brand-dark/15 bg-white text-brand-dark hover:bg-brand-dark/5"
                      : "bg-brand-neon text-brand-dark hover:opacity-90"
                  }`}
                >
                  {item.connected ? "Yönet" : "Bağla"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AyarlarPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profil");

  return (
    <div className="px-4 pb-20 pt-2 sm:px-6 lg:px-8 lg:pt-4">
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

        <div className="min-w-0 flex-1 rounded-2xl border border-brand-dark/8 bg-white p-5 sm:p-6">
          {activeTab === "profil" && <ProfilTab />}
          {activeTab === "guvenlik" && <GuvenlikTab />}
          {activeTab === "bildirimler" && <BildirimlerTab />}
          {activeTab === "entegrasyonlar" && <EntegrasyonlarTab />}
        </div>
      </div>
    </div>
  );
}
