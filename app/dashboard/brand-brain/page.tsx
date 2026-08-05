"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Info,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  MAX_BRAND_DNA_COLORS,
  MAX_BRAND_DNA_KEYWORDS,
  computeBrandDnaCompletion,
  emptyBrandDna,
  isValidHexColor,
  normalizeHexColor,
  type BrandDnaCompletion,
  type BrandDnaPublicProfile,
} from "@/lib/brand-dna/types";
import {
  fetchDashboardCached,
  getDashboardCache,
  setDashboardCache,
} from "@/lib/dashboard/client-cache";
import { withReturnTo } from "@/lib/dashboard/return-navigation";

/** Canonical stored values (API / existing profiles). Labels come from i18n. */
const PERSONALITY_VALUES = [
  "Lüks",
  "Yenilikçi",
  "Kurumsal",
  "Samimi",
  "Modern",
  "Teknik",
  "Yaratıcı",
  "Eğlenceli",
  "Genç",
  "Sürdürülebilir",
  "Doğal",
  "Dinamik",
  "Temiz",
  "Sade",
  "Özgün",
  "Sıcak",
  "Vizyoner",
  "Otantik",
  "Güvenilir",
  "Kendinden Emin",
] as const;

const TONE_VALUES = [
  "Profesyonel",
  "Kendine Güvenen",
  "Samimi",
  "Dürüst",
  "İlham Verici",
  "Dostça",
  "Teknik",
  "Lüks",
  "Eğitici",
  "Direkt",
  "Konuşma Dili",
  "Kurumsal",
  "Sıcak",
  "Cesur",
  "Yenilikçi",
  "Royal",
  "Minimal",
  "Empatik",
  "Motivasyonel",
  "Otoriter",
] as const;

/** Google Fonts'ta en çok kullanılan başlık / display yüzleri */
const headingFontOptions = [
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Oswald",
  "Raleway",
  "Roboto Slab",
  "Merriweather",
  "Lora",
  "Josefin Sans",
  "DM Serif Display",
  "Space Grotesk",
  "Cormorant Garamond",
  "Fraunces",
  "Abril Fatface",
  "Bebas Neue",
  "Anton",
  "Cinzel",
  "Libre Baskerville",
  "EB Garamond",
  "Syne",
] as const;

/** Google Fonts'ta en çok kullanılan gövde / UI yüzleri */
const bodyFontOptions = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Noto Sans",
  "Source Sans 3",
  "Nunito Sans",
  "Work Sans",
  "DM Sans",
  "Plus Jakarta Sans",
  "Manrope",
  "IBM Plex Sans",
  "Ubuntu",
  "Mulish",
  "Figtree",
  "Karla",
  "PT Sans",
  "Nunito",
  "Outfit",
  "Urbanist",
] as const;

const SECTOR_VALUES = [
  "Moda ve Giyim",
  "Güzellik ve Kozmetik",
  "Yeme-İçme / Restoran",
  "Spor ve Fitness",
  "Turizm ve Seyahat",
  "Teknoloji ve Elektronik",
  "Eğitim ve Online Kurslar",
  "Sağlık ve Wellness",
  "Oyun / E-Spor",
  "E-Ticaret ve Perakende",
  "Diğer",
] as const;

const OTHER_SECTOR_VALUE = "Diğer";

const AUDIENCE_VALUES = [
  "B2B",
  "B2C",
  "Profesyoneller",
  "Ebeveynler",
  "Doktorlar",
  "Mühendisler",
  "Öğrenciler",
  "Yöneticiler",
] as const;

const MAX_CUSTOM_AUDIENCES = 2;

const COMPLETION_KEYS: (keyof BrandDnaCompletion["sections"])[] = [
  "logo",
  "colors",
  "typography",
  "personality",
  "toneOfVoice",
  "audience",
  "sector",
  "keywords",
];

function emptyPublicProfile(): BrandDnaPublicProfile {
  const base = emptyBrandDna("", "");
  return { ...base, completion: computeBrandDnaCompletion(base) };
}

function formatUpdatedAt(iso: string | null, locale: string, neverLabel: string): string {
  if (!iso) return neverLabel;
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function scoreHeadline(
  score: number,
  messages: { strong: string; good: string; forming: string; incomplete: string },
): string {
  if (score >= 90) return messages.strong;
  if (score >= 70) return messages.good;
  if (score >= 40) return messages.forming;
  return messages.incomplete;
}

function scoreDescription(
  score: number,
  messages: { high: string; mid: string; low: string },
): string {
  if (score >= 70) return messages.high;
  if (score >= 40) return messages.mid;
  return messages.low;
}

function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col rounded-2xl border border-brand-dark/8 bg-white p-4 sm:p-5">
      <div className="mb-3.5 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-brand-dark">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-snug text-brand-dark/45">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function SelectableChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[#42B24D]/35 bg-[#42B24D]/12 text-[#1D6A27]"
          : "border-brand-dark/12 bg-white text-brand-dark/65 hover:bg-brand-dark/4"
      }`}
    >
      {label}
    </button>
  );
}

const CLEAR_OPTION = "-";

function BrandSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  optionsAria,
  allowClear = true,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder: string;
  optionsAria: string;
  allowClear?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || disabled) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, disabled]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const listItems = allowClear
    ? [
        { key: "__clear__", label: CLEAR_OPTION, value: "" },
        ...options.map((o) => ({ key: o.value, label: o.label, value: o.value })),
      ]
    : options.map((o) => ({ key: o.value, label: o.label, value: o.value }));

  const displayLabel =
    options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={rootRef} className={`relative ${disabled ? "opacity-45" : ""}`}>
      <p className="mb-1.5 text-xs font-medium text-brand-dark/55">{label}</p>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-brand-dark/12 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-brand-dark outline-none transition-colors hover:border-brand-dark/25 focus:border-brand-dark/30 disabled:pointer-events-none disabled:cursor-not-allowed"
      >
        <span className={value ? "" : "text-brand-dark/40"}>
          {value ? displayLabel : placeholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-brand-dark/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={2}
        />
      </button>

      {open && !disabled ? (
        <ul
          role="listbox"
          aria-label={optionsAria}
          className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-auto rounded-xl border border-brand-dark/10 bg-white py-1.5 font-sans shadow-lg shadow-brand-dark/8"
        >
          {listItems.map((item) => {
            const isActive = item.value === value;
            return (
              <li key={item.key} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-brand-neon/50 font-semibold text-brand-dark"
                      : "font-medium text-brand-dark/75 hover:bg-brand-dark/4"
                  }`}
                >
                  <Check
                    className={`size-3.5 shrink-0 ${
                      isActive ? "text-brand-dark" : "text-transparent"
                    }`}
                    strokeWidth={2.25}
                  />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export default function BrandBrainPage() {
  const t = useTranslations("dashboard.brandDna");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [profile, setProfile] = useState<BrandDnaPublicProfile>(emptyPublicProfile);
  const [colors, setColors] = useState<string[]>([]);
  const [headingFont, setHeadingFont] = useState("");
  const [bodyFont, setBodyFont] = useState("");
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([]);
  const [selectedTone, setSelectedTone] = useState<string[]>([]);
  const [selectedAudience, setSelectedAudience] = useState<string[]>([]);
  const [audienceDraft, setAudienceDraft] = useState("");
  const [sectorMain, setSectorMain] = useState("");
  const [sectorSub, setSectorSub] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [colorDraft, setColorDraft] = useState("#42B24D");
  const [colorError, setColorError] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const colorPickerInputRef = useRef<HTMLInputElement>(null);
  const colorHexInputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);
  const hydrated = useRef(false);

  const isOtherSector = sectorMain === OTHER_SECTOR_VALUE;
  const personalityLabels = t.raw("options.personality") as string[];
  const toneLabels = t.raw("options.tone") as string[];
  const audienceLabels = t.raw("options.audience") as string[];
  const sectorLabels = t.raw("options.sector") as string[];

  const labelForValue = (values: readonly string[], labels: string[], value: string) => {
    const idx = values.indexOf(value);
    return idx >= 0 ? (labels[idx] ?? value) : value;
  };

  const personalityOptions = PERSONALITY_VALUES.map((value, i) => ({
    value,
    label: personalityLabels[i] ?? value,
  }));
  const toneOptions = TONE_VALUES.map((value, i) => ({
    value,
    label: toneLabels[i] ?? value,
  }));
  const sectorOptions = SECTOR_VALUES.map((value, i) => ({
    value,
    label: sectorLabels[i] ?? value,
  }));

  const presetAudienceSet = useMemo(
    () => new Set<string>(AUDIENCE_VALUES),
    [],
  );
  const customAudiences = selectedAudience.filter(
    (item) => !presetAudienceSet.has(item),
  );
  const audienceItems = useMemo(
    () => [...AUDIENCE_VALUES, ...customAudiences],
    [customAudiences],
  );

  const statusLabel = (status: string) => {
    if (status === "Tamamlandı" || status === "Eksik") {
      return t(`status.${status}`);
    }
    return status;
  };

  const scoreLabelText = (label: string) => {
    if (
      label === "Zayıf" ||
      label === "Orta" ||
      label === "İyi" ||
      label === "Mükemmel"
    ) {
      return t(`scoreLabels.${label}`);
    }
    return label;
  };

  const draftProfile = useMemo(
    () => ({
      ...profile,
      colors,
      headingFont: headingFont || null,
      bodyFont: bodyFont || null,
      personality: selectedPersonality,
      toneOfVoice: selectedTone,
      audiences: selectedAudience,
      audienceNote: "",
      sectorMain: sectorMain || null,
      sectorSub: isOtherSector ? sectorSub || null : null,
      keywords,
    }),
    [
      profile,
      colors,
      headingFont,
      bodyFont,
      selectedPersonality,
      selectedTone,
      selectedAudience,
      sectorMain,
      sectorSub,
      isOtherSector,
      keywords,
    ],
  );

  const completion = useMemo(
    () => computeBrandDnaCompletion(draftProfile),
    [draftProfile],
  );
  const score = completion.score;
  const circle = useMemo(() => {
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    return { radius, circumference, strokeDashoffset };
  }, [score]);

  const clearLocalPreview = () => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
  };

  const applyProfile = (next: BrandDnaPublicProfile) => {
    skipNextSave.current = true;
    setProfile(next);
    setColors(next.colors);
    setHeadingFont(next.headingFont ?? "");
    setBodyFont(next.bodyFont ?? "");
    setSelectedPersonality(next.personality);
    setSelectedTone(next.toneOfVoice);
    setSelectedAudience(next.audiences);
    setSectorMain(next.sectorMain ?? "");
    setSectorSub(next.sectorSub ?? "");
    setKeywords(next.keywords);
    clearLocalPreview();
    if (next.logo?.storagePath || next.logo?.mediaUrl) {
      const bust = encodeURIComponent(
        next.updatedAt || next.logo.storagePath || "1",
      );
      setLogoPreviewUrl(`/api/dashboard/brand-dna/logo?v=${bust}`);
    } else {
      setLogoPreviewUrl(null);
    }
  };

  useEffect(() => {
    return () => clearLocalPreview();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!getDashboardCache("dashboard:brand-dna")) setLoading(true);
      try {
        const data = await fetchDashboardCached<{
          profile: BrandDnaPublicProfile;
        }>({
          key: "dashboard:brand-dna",
          url: "/api/dashboard/brand-dna",
          onCache: (cached) => {
            if (cancelled || !cached.profile) return;
            applyProfile(cached.profile);
            hydrated.current = true;
            setLoading(false);
          },
        });
        if (cancelled) return;
        applyProfile(data.profile);
        hydrated.current = true;
      } catch (error) {
        if ((error as Error).name === "AbortError" || cancelled) return;
        toast.error(t("toasts.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void (async () => {
        setSaving(true);
        try {
          const res = await fetch("/api/dashboard/brand-dna", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              colors,
              headingFont: headingFont || null,
              bodyFont: bodyFont || null,
              personality: selectedPersonality,
              toneOfVoice: selectedTone,
              audiences: selectedAudience,
              audienceNote: "",
              sectorMain: sectorMain || null,
              sectorSub: isOtherSector ? sectorSub || null : null,
              keywords,
            }),
          });
          if (!res.ok) throw new Error("save failed");
          const data = (await res.json()) as { profile: BrandDnaPublicProfile };
          skipNextSave.current = true;
          setProfile(data.profile);
          setDashboardCache("dashboard:brand-dna", data);
        } catch {
          toast.error(t("toasts.saveError"));
        } finally {
          setSaving(false);
        }
      })();
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    colors,
    headingFont,
    bodyFont,
    selectedPersonality,
    selectedTone,
    selectedAudience,
    sectorMain,
    sectorSub,
    isOtherSector,
    keywords,
    t,
  ]);

  const toggleMulti = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    selected: string[],
    max: number,
  ) => {
    if (selected.includes(value)) {
      setter(selected.filter((item) => item !== value));
      return;
    }
    if (selected.length >= max) return;
    setter([...selected, value]);
  };

  const addKeyword = () => {
    const value = keywordInput.trim();
    if (!value || keywords.includes(value) || keywords.length >= MAX_BRAND_DNA_KEYWORDS) {
      return;
    }
    setKeywords((prev) => [...prev, value]);
    setKeywordInput("");
  };

  const addCustomAudience = () => {
    const value = audienceDraft.trim();
    if (!value) return;

    if (presetAudienceSet.has(value)) {
      if (!selectedAudience.includes(value)) {
        toggleMulti(value, setSelectedAudience, selectedAudience, 8);
      }
      setAudienceDraft("");
      return;
    }

    if (selectedAudience.includes(value)) {
      setAudienceDraft("");
      return;
    }

    if (customAudiences.length >= MAX_CUSTOM_AUDIENCES) {
      toast.error(t("sections.audience.customMaxToast", { max: MAX_CUSTOM_AUDIENCES }));
      return;
    }

    if (selectedAudience.length >= 8) {
      toast.error(t("sections.audience.totalMaxToast"));
      return;
    }

    setSelectedAudience((prev) => [...prev, value]);
    setAudienceDraft("");
  };

  const addColor = () => {
    const trimmed = colorDraft.trim();
    if (!isValidHexColor(trimmed)) {
      const message = t("sections.colors.invalidHexLong");
      setColorError(message);
      toast.error(message);
      return;
    }
    const normalized = normalizeHexColor(trimmed);
    if (!normalized) {
      setColorError(t("sections.colors.invalidHexShort"));
      return;
    }
    if (colors.includes(normalized)) {
      setColorError(t("sections.colors.duplicate"));
      return;
    }
    if (colors.length >= MAX_BRAND_DNA_COLORS) {
      const message = t("sections.colors.maxReached", { max: MAX_BRAND_DNA_COLORS });
      setColorError(message);
      toast.error(message);
      return;
    }
    setColorError(null);
    const nextLength = colors.length + 1;
    setColors((prev) => [...prev, normalized]);
    setColorDraft(normalized);
    if (nextLength >= MAX_BRAND_DNA_COLORS) {
      setColorPickerOpen(false);
    }
  };

  const removeColor = (color: string) => {
    setColors((prev) => prev.filter((item) => item !== color));
  };

  const openColorPicker = () => {
    if (colors.length >= MAX_BRAND_DNA_COLORS) return;
    setColorPickerOpen(true);
    requestAnimationFrame(() => {
      colorPickerInputRef.current?.click();
      colorHexInputRef.current?.focus();
    });
  };

  const uploadLogo = async (file: File) => {
    setLogoBusy(true);
    clearLocalPreview();
    const localUrl = URL.createObjectURL(file);
    localPreviewRef.current = localUrl;
    setLogoPreviewUrl(localUrl);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/dashboard/brand-dna/logo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (data?.error === "FILE_TOO_LARGE") {
          throw new Error(t("toasts.logoTooLarge"));
        }
        if (data?.error === "UNSUPPORTED_TYPE") {
          throw new Error(t("toasts.logoUnsupported"));
        }
        throw new Error("upload failed");
      }
      const data = (await res.json()) as { profile: BrandDnaPublicProfile };
      applyProfile(data.profile);
      toast.success(t("toasts.logoUploaded"));
    } catch (error) {
      clearLocalPreview();
      setLogoPreviewUrl(
        profile.logo
          ? `/api/dashboard/brand-dna/logo?v=${encodeURIComponent(profile.updatedAt || "1")}`
          : null,
      );
      toast.error(error instanceof Error ? error.message : t("toasts.logoUploadFailed"));
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const removeLogo = async () => {
    setLogoBusy(true);
    try {
      const res = await fetch("/api/dashboard/brand-dna/logo", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      const data = (await res.json()) as { profile: BrandDnaPublicProfile };
      applyProfile(data.profile);
      toast.success(t("toasts.logoRemoved"));
    } catch {
      toast.error(t("toasts.logoRemoveFailed"));
    } finally {
      setLogoBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            {t("subtitle")}
          </p>
        </div>
        {saving ? (
          <p className="text-xs font-medium text-brand-dark/40">{t("saving")}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:items-stretch">
          <SectionCard title={t("sections.logo.title")} subtitle={t("sections.logo.subtitle")}>
            <div className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-brand-dark/10 bg-bg-offwhite p-3.5">
              <div className="relative flex min-h-32 w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-dashed border-brand-dark/15 bg-white px-4 py-4">
                {logoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreviewUrl}
                    alt={t("sections.logo.alt")}
                    className="max-h-full max-w-full object-contain object-center"
                  />
                ) : (
                  <p className="text-center text-xs text-brand-dark/40">
                    {t("sections.logo.empty")}
                  </p>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,.svg,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadLogo(file);
                }}
              />
              <div className="mt-3 shrink-0">
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5 disabled:opacity-50"
                  >
                    <UploadCloud className="size-3.5" strokeWidth={2} />
                    {logoBusy ? t("sections.logo.uploading") : t("sections.logo.upload")}
                  </button>
                  {profile.logo ? (
                    <button
                      type="button"
                      disabled={logoBusy}
                      onClick={() => void removeLogo()}
                      className="inline-flex items-center justify-center rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-brand-dark/60 transition-colors hover:bg-brand-dark/5 disabled:opacity-50"
                      aria-label={t("sections.logo.removeAria")}
                    >
                      <Trash2 className="size-3.5" strokeWidth={2} />
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-center text-[11px] text-brand-dark/40">
                  {t("sections.logo.hint")}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title={t("sections.colors.title")}
            subtitle={t("sections.colors.subtitle")}
            right={
              <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">
                {t("sections.colors.maxColors", { max: MAX_BRAND_DNA_COLORS })}
              </span>
            }
          >
            <div className="flex h-full flex-col">
              <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                {colors.map((color) => (
                  <div key={color} className="flex flex-col items-center">
                    <div className="group relative aspect-square w-full min-h-14 overflow-hidden rounded-xl border border-brand-dark/12 sm:min-h-6">
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => removeColor(color)}
                        title={t("sections.colors.removeTitle", { color })}
                        aria-label={t("sections.colors.removeAria", { color })}
                        className="absolute right-1 top-1 flex size-5 cursor-pointer items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X className="size-3" strokeWidth={2.5} />
                      </button>
                    </div>
                    <p className="mt-1.5 w-full text-center text-[10px] font-medium tabular-nums leading-tight text-brand-dark/55">
                      {color}
                    </p>
                  </div>
                ))}
                {colors.length < MAX_BRAND_DNA_COLORS ? (
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={openColorPicker}
                      title={t("sections.colors.addTitle")}
                      aria-label={t("sections.colors.addAria")}
                      aria-expanded={colorPickerOpen}
                      className={`flex aspect-square w-full min-h-14 cursor-pointer items-center justify-center rounded-xl border border-dashed transition-colors sm:min-h-6 ${
                        colorPickerOpen
                          ? "border-brand-dark/35 bg-brand-dark/4 text-brand-dark/50"
                          : "border-brand-dark/20 bg-brand-dark/2 text-brand-dark/30 hover:border-brand-dark/35 hover:bg-brand-dark/4 hover:text-brand-dark/45"
                      }`}
                    >
                      <Plus className="size-5" strokeWidth={1.75} />
                    </button>
                    <p className="mt-1.5 w-full text-center text-[10px] font-medium leading-tight text-brand-dark/40">
                      {t("sections.colors.add")}
                    </p>
                  </div>
                ) : null}
              </div>
              {colorPickerOpen && colors.length < MAX_BRAND_DNA_COLORS ? (
                <div className="mt-auto space-y-1.5 pt-5">
                  <div className="flex items-center gap-2">
                    <input
                      ref={colorPickerInputRef}
                      type="color"
                      value={normalizeHexColor(colorDraft) ?? "#42B24D"}
                      onChange={(e) => {
                        const next = e.target.value.toUpperCase();
                        setColorDraft(next);
                        setColorError(null);
                      }}
                      className="size-9 shrink-0 cursor-pointer rounded-lg border border-brand-dark/12 bg-white p-1"
                      aria-label={t("sections.colors.pickerAria")}
                    />
                    <input
                      ref={colorHexInputRef}
                      value={colorDraft}
                      onChange={(e) => {
                        const next = e.target.value;
                        setColorDraft(next);
                        if (!next.trim()) {
                          setColorError(null);
                          return;
                        }
                        setColorError(
                          isValidHexColor(next)
                            ? null
                            : t("sections.colors.invalidHex"),
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addColor();
                        }
                      }}
                      placeholder="#FFFFFF"
                      spellCheck={false}
                      aria-invalid={Boolean(colorError)}
                      className={`min-w-0 flex-1 rounded-lg border bg-white px-2.5 py-2 text-xs font-medium tabular-nums text-brand-dark outline-none focus:border-brand-dark/30 ${
                        colorError
                          ? "border-[#D64545]/50"
                          : "border-brand-dark/12"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={addColor}
                      disabled={Boolean(colorError && colorDraft.trim())}
                      className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5 disabled:opacity-50"
                    >
                      <Plus className="size-3.5" strokeWidth={2.2} />
                      {t("sections.colors.add")}
                    </button>
                  </div>
                  {colorError ? (
                    <p className="text-[11px] font-medium text-[#D64545]">
                      {colorError}
                    </p>
                  ) : (
                    <p className="text-[11px] text-brand-dark/40">
                      {t("sections.colors.pickerHint")}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title={t("sections.typography.title")}
            subtitle={t("sections.typography.subtitle")}
          >
            <div className="flex h-full flex-col gap-3">
              <BrandSelect
                label={t("sections.typography.headingLabel")}
                value={headingFont}
                options={headingFontOptions.map((value) => ({ value, label: value }))}
                onChange={setHeadingFont}
                placeholder={t("sections.typography.headingPlaceholder")}
                optionsAria={t("selectOptionsAria", {
                  label: t("sections.typography.headingLabel"),
                })}
                allowClear
              />
              <BrandSelect
                label={t("sections.typography.bodyLabel")}
                value={bodyFont}
                options={bodyFontOptions.map((value) => ({ value, label: value }))}
                onChange={setBodyFont}
                placeholder={t("sections.typography.bodyPlaceholder")}
                optionsAria={t("selectOptionsAria", {
                  label: t("sections.typography.bodyLabel"),
                })}
                allowClear
              />
              <div className="mt-auto rounded-lg border border-brand-dark/10 bg-bg-offwhite p-3">
                <p className="text-2xl leading-none text-brand-dark">Aa</p>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-dark/60">
                  {t("sections.typography.previewHint")}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
          <SectionCard
            title={t("sections.personality.title")}
            subtitle={t("sections.personality.subtitle")}
            right={
              <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">
                {t("sections.personality.maxHint", {
                  count: selectedPersonality.length,
                })}
              </span>
            }
          >
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {personalityOptions.map((item) => (
                <SelectableChip
                  key={item.value}
                  label={item.label}
                  active={selectedPersonality.includes(item.value)}
                  onClick={() =>
                    toggleMulti(
                      item.value,
                      setSelectedPersonality,
                      selectedPersonality,
                      5,
                    )
                  }
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title={t("sections.tone.title")}
            subtitle={t("sections.tone.subtitle")}
            right={
              <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">
                {t("sections.tone.maxHint", { count: selectedTone.length })}
              </span>
            }
          >
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {toneOptions.map((item) => (
                <SelectableChip
                  key={item.value}
                  label={item.label}
                  active={selectedTone.includes(item.value)}
                  onClick={() =>
                    toggleMulti(item.value, setSelectedTone, selectedTone, 5)
                  }
                />
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-7">
            <SectionCard
              title={t("sections.audience.title")}
              subtitle={t("sections.audience.subtitle")}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {audienceItems.map((audience) => {
                  const active = selectedAudience.includes(audience);
                  const isCustom = !presetAudienceSet.has(audience);
                  return (
                    <label
                      key={audience}
                      className="relative inline-flex cursor-pointer items-center gap-2 text-sm text-brand-dark/70"
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {
                          if (isCustom && active) {
                            setSelectedAudience((prev) =>
                              prev.filter((item) => item !== audience),
                            );
                            return;
                          }
                          toggleMulti(
                            audience,
                            setSelectedAudience,
                            selectedAudience,
                            8,
                          );
                        }}
                        className="peer absolute top-1/2 left-0 size-4 -translate-y-1/2 opacity-0"
                      />
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          active
                            ? "border-brand-dark bg-brand-dark"
                            : "border-brand-dark/25 bg-white"
                        }`}
                        aria-hidden
                      >
                        <Check
                          className={`size-3 text-brand-neon transition-opacity ${
                            active ? "opacity-100" : "opacity-0"
                          }`}
                          strokeWidth={3}
                        />
                      </span>
                      <span className="truncate">
                        {labelForValue(AUDIENCE_VALUES, audienceLabels, audience)}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3">
                <textarea
                  value={audienceDraft}
                  onChange={(e) => setAudienceDraft(e.target.value.slice(0, 80))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addCustomAudience();
                    }
                  }}
                  placeholder={t("sections.audience.customPlaceholder")}
                  maxLength={80}
                  rows={2}
                  disabled={customAudiences.length >= MAX_CUSTOM_AUDIENCES}
                  className="w-full resize-none rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 outline-none transition-colors focus:border-brand-dark/30 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-brand-dark/40">
                    {customAudiences.length >= MAX_CUSTOM_AUDIENCES
                      ? t("sections.audience.customMax", {
                          max: MAX_CUSTOM_AUDIENCES,
                        })
                      : t("sections.audience.charCount", {
                          count: audienceDraft.length,
                        })}
                  </p>
                  {audienceDraft.trim() ? (
                    <button
                      type="button"
                      onClick={addCustomAudience}
                      disabled={customAudiences.length >= MAX_CUSTOM_AUDIENCES}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-brand-dark/12 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5 disabled:opacity-50"
                    >
                      <Plus className="size-3.5" strokeWidth={2.2} />
                      {t("sections.audience.add")}
                    </button>
                  ) : null}
                </div>
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-5">
            <SectionCard
              title={t("sections.sector.title")}
              subtitle={t("sections.sector.subtitle")}
            >
              <div className="flex flex-col gap-3 pt-1">
                <BrandSelect
                  label={t("sections.sector.label")}
                  value={sectorMain}
                  options={sectorOptions}
                  onChange={(value) => {
                    setSectorMain(value);
                    setSectorSub("");
                  }}
                  placeholder={t("sections.sector.placeholder")}
                  optionsAria={t("selectOptionsAria", {
                    label: t("sections.sector.label"),
                  })}
                  allowClear
                />
                {isOtherSector ? (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-brand-dark/55">
                      {t("sections.sector.otherLabel")}
                    </p>
                    <input
                      value={sectorSub}
                      onChange={(e) => setSectorSub(e.target.value)}
                      placeholder={t("sections.sector.otherPlaceholder")}
                      maxLength={80}
                      className="w-full rounded-xl border border-brand-dark/12 bg-white px-3.5 py-2.5 text-sm font-medium text-brand-dark placeholder:font-normal placeholder:text-brand-dark/35 outline-none transition-colors focus:border-brand-dark/30"
                    />
                  </div>
                ) : null}
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title={t("sections.keywords.title")}
          subtitle={t("sections.keywords.subtitle")}
          right={
            <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">
              {t("sections.keywords.maxHint", { max: MAX_BRAND_DNA_KEYWORDS })}
            </span>
          }
        >
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 rounded-full bg-[#42B24D]/12 px-2.5 py-1 text-xs font-medium text-[#1D6A27]"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() =>
                    setKeywords((prev) => prev.filter((item) => item !== keyword))
                  }
                  className="text-[#1D6A27]/70 hover:text-[#1D6A27]"
                  aria-label={t("sections.keywords.removeAria", { keyword })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder={t("sections.keywords.placeholder")}
              className="min-w-0 flex-1 rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 outline-none transition-colors focus:border-brand-dark/30"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-dark/12 bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5 sm:shrink-0"
            >
              <Plus className="size-4" strokeWidth={2} />
              {t("sections.keywords.add")}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-brand-dark/40">
            {t("sections.keywords.count", {
              count: keywords.length,
              max: MAX_BRAND_DNA_KEYWORDS,
            })}
          </p>
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-4">
            <section className="flex h-full flex-col rounded-2xl border border-brand-dark/8 bg-white p-4 sm:p-5">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                <div className="relative flex size-24 shrink-0 items-center justify-center sm:size-28">
                  <svg viewBox="0 0 112 112" className="size-full -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r={circle.radius}
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-brand-dark/10"
                      fill="none"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r={circle.radius}
                      stroke="currentColor"
                      strokeWidth="10"
                      className="text-[#42B24D]"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={circle.circumference}
                      strokeDashoffset={circle.strokeDashoffset}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-3xl font-bold tracking-tight text-brand-dark">
                      {score}
                    </p>
                    <p className="text-xs text-brand-dark/45">{t("scoreOutOf")}</p>
                  </div>
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <span className="inline-flex rounded-full bg-[#42B24D]/12 px-2.5 py-1 text-xs font-semibold text-[#1D6A27]">
                    {scoreLabelText(completion.label)}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-brand-dark">
                    {scoreHeadline(score, {
                      strong: t("scoreHeadline.strong"),
                      good: t("scoreHeadline.good"),
                      forming: t("scoreHeadline.forming"),
                      incomplete: t("scoreHeadline.incomplete"),
                    })}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-dark/55">
                    {scoreDescription(score, {
                      high: t("scoreDescription.high"),
                      mid: t("scoreDescription.mid"),
                      low: t("scoreDescription.low"),
                    })}
                  </p>
                </div>
              </div>
              <p className="mt-auto pt-4 text-center text-xs text-brand-dark/40 sm:text-left">
                {t("updatedAt", {
                  date: formatUpdatedAt(
                    profile.updatedAt,
                    locale,
                    t("updatedNever"),
                  ),
                })}
              </p>
            </section>
          </div>

          <div className="lg:col-span-5">
            <section className="flex h-full flex-col rounded-2xl border border-brand-dark/8 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-brand-dark">
                {t("completionTitle")}
              </h2>
              <div className="mt-3 grid flex-1 grid-cols-1 content-start gap-1.5 sm:grid-cols-2">
                {COMPLETION_KEYS.map((key) => {
                  const status = completion.sections[key];
                  const done = status === "Tamamlandı";
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 rounded-lg bg-bg-offwhite px-2.5 py-2"
                    >
                      <span className="truncate text-sm text-brand-dark/70">
                        {t(`completionLabels.${key}`)}
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold ${
                          done ? "text-[#1D6A27]" : "text-[#D64545]"
                        }`}
                      >
                        {done ? (
                          <CheckCircle2 className="size-3.5" strokeWidth={2.4} />
                        ) : (
                          <AlertCircle className="size-3.5" strokeWidth={2.4} />
                        )}
                        {statusLabel(status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="lg:col-span-3">
            <section className="flex h-full flex-col rounded-2xl border border-[#B9E5BF] bg-[#F4FBF5] p-4 sm:p-5">
              <div className="mb-2 inline-flex size-8 items-center justify-center rounded-full bg-[#42B24D]/15">
                <Info className="size-4 text-[#1D6A27]" strokeWidth={2} />
              </div>
              <h2 className="text-sm font-semibold text-brand-dark">
                {t("whyImportantTitle")}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-dark/70">
                {t("whyImportantBody")}
              </p>
              <p className="mt-3 text-sm font-semibold text-brand-dark/70">
                {t("whyImportantFooter")}
              </p>
            </section>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark/8 bg-white p-4">
        <div>
          <p className="text-base font-semibold text-brand-dark">
            {score >= 70 ? t("ctaReady") : t("ctaIncomplete")}
          </p>
          <p className="text-sm text-brand-dark/55">
            {t("ctaBody")}
          </p>
        </div>
        <Link
          href={withReturnTo("/dashboard/yeni-analiz", "/dashboard/brand-brain")}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t("ctaButton")}
        </Link>
      </div>
    </div>
  );
}
