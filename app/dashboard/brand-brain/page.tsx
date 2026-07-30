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
} from "lucide-react";
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

const personalityOptions = [
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
];

const toneOptions = [
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
];

const headingFontOptions = [
  "Playfair Display",
  "DM Serif Display",
  "Cormorant Garamond",
] as const;

const bodyFontOptions = ["Inter", "Manrope", "Plus Jakarta Sans"] as const;

const sectorMainOptions = [
  "Cilt Bakımı / Kozmetik",
  "Moda / Tekstil",
  "Gıda / İçecek",
  "Teknoloji",
  "Sağlık",
  "Eğitim",
  "Finans",
  "Diğer",
] as const;

const sectorSubByMain: Record<string, string[]> = {
  "Cilt Bakımı / Kozmetik": ["Skincare", "Saç Bakımı", "Dermokozmetik", "Makyaj"],
  "Moda / Tekstil": ["Giyim", "Aksesuar", "Ayakkabı", "Spor Giyim"],
  "Gıda / İçecek": ["Restoran", "İçecek", "Atıştırmalık", "Organik"],
  Teknoloji: ["SaaS", "Donanım", "Mobil Uygulama", "AI"],
  Sağlık: ["Klinik", "Wellness", "Supplement", "Medikal"],
  Eğitim: ["Online Kurs", "Kurumsal Eğitim", "Okul"],
  Finans: ["Fintech", "Sigorta", "Yatırım"],
};

const targetAudience = [
  "B2B",
  "B2C",
  "Profesyoneller",
  "Ebeveynler",
  "Doktorlar",
  "Mühendisler",
  "Öğrenciler",
  "Yöneticiler",
];

const COMPLETION_LABELS: { key: keyof BrandDnaCompletion["sections"]; label: string }[] =
  [
    { key: "logo", label: "Logo" },
    { key: "colors", label: "Renk Paleti" },
    { key: "typography", label: "Tipografi" },
    { key: "personality", label: "Marka Kişiliği" },
    { key: "toneOfVoice", label: "Tone of Voice" },
    { key: "audience", label: "Hedef Kitle" },
    { key: "sector", label: "Sektör" },
    { key: "keywords", label: "Anahtar Kelimeler" },
  ];

function emptyPublicProfile(): BrandDnaPublicProfile {
  const base = emptyBrandDna("", "");
  return { ...base, completion: computeBrandDnaCompletion(base) };
}

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "Henüz kaydedilmedi";
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function scoreHeadline(score: number, label: string): string {
  if (score >= 90) return "Brand DNA'nız güçlü ve tutarlı.";
  if (score >= 70) return "Brand DNA'nız iyi durumda.";
  if (score >= 40) return "Brand DNA'nız şekilleniyor.";
  return "Brand DNA'nızı tamamlayın.";
}

function scoreDescription(score: number): string {
  if (score >= 70) {
    return "Bu sayede analizler daha isabetli ve içerik önerileri daha değerli olacak.";
  }
  if (score >= 40) {
    return "Eksik bölümleri tamamladıkça skorlama referansınız güçlenecek.";
  }
  return "Logo, renk, tipografi ve ton tanımları analiz isabetini doğrudan etkiler.";
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
  placeholder = "Seçin",
  allowClear = true,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder?: string;
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
    ? [{ key: "__clear__", label: CLEAR_OPTION, value: "" }, ...options.map((o) => ({ key: o, label: o, value: o }))]
    : options.map((o) => ({ key: o, label: o, value: o }));

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
          {value || placeholder}
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
          aria-label={`${label} seçenekleri`}
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
  const [audienceNote, setAudienceNote] = useState("");
  const [sectorMain, setSectorMain] = useState("");
  const [sectorSub, setSectorSub] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [colorDraft, setColorDraft] = useState("#42B24D");
  const [colorError, setColorError] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const localPreviewRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);
  const hydrated = useRef(false);

  const draftProfile = useMemo(
    () => ({
      ...profile,
      colors,
      headingFont: headingFont || null,
      bodyFont: bodyFont || null,
      personality: selectedPersonality,
      toneOfVoice: selectedTone,
      audiences: selectedAudience,
      audienceNote,
      sectorMain: sectorMain || null,
      sectorSub: sectorSub || null,
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
      audienceNote,
      sectorMain,
      sectorSub,
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

  const isOtherSector = sectorMain === "Diğer";
  const sectorSubOptions = !sectorMain || isOtherSector
    ? []
    : sectorSubByMain[sectorMain] ?? [];

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
    setAudienceNote(next.audienceNote);
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
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard/brand-dna", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as { profile: BrandDnaPublicProfile };
        if (cancelled) return;
        applyProfile(data.profile);
        hydrated.current = true;
      } catch (error) {
        if ((error as Error).name === "AbortError" || cancelled) return;
        toast.error("Brand DNA verileri yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

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
              audienceNote,
              sectorMain: sectorMain || null,
              sectorSub: sectorSub || null,
              keywords,
            }),
          });
          if (!res.ok) throw new Error("save failed");
          const data = (await res.json()) as { profile: BrandDnaPublicProfile };
          skipNextSave.current = true;
          setProfile(data.profile);
        } catch {
          toast.error("Brand DNA kaydedilemedi");
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
    audienceNote,
    sectorMain,
    sectorSub,
    keywords,
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

  const addColor = () => {
    const trimmed = colorDraft.trim();
    if (!isValidHexColor(trimmed)) {
      const message =
        "Geçerli bir HEX kodu girin (#RGB veya #RRGGBB, örn. #FFFFFF)";
      setColorError(message);
      toast.error(message);
      return;
    }
    const normalized = normalizeHexColor(trimmed);
    if (!normalized) {
      setColorError("Geçerli bir HEX kodu girin (#RGB veya #RRGGBB)");
      return;
    }
    if (colors.includes(normalized)) {
      setColorError("Bu renk zaten palette");
      return;
    }
    if (colors.length >= MAX_BRAND_DNA_COLORS) {
      const message = `En fazla ${MAX_BRAND_DNA_COLORS} renk ekleyebilirsiniz`;
      setColorError(message);
      toast.error(message);
      return;
    }
    setColorError(null);
    setColors((prev) => [...prev, normalized]);
    setColorDraft(normalized);
  };

  const removeColor = (color: string) => {
    setColors((prev) => prev.filter((item) => item !== color));
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
          throw new Error("Logo en fazla 5MB olabilir");
        }
        if (data?.error === "UNSUPPORTED_TYPE") {
          throw new Error("SVG, PNG veya JPG yükleyin");
        }
        throw new Error("upload failed");
      }
      const data = (await res.json()) as { profile: BrandDnaPublicProfile };
      applyProfile(data.profile);
      toast.success("Logo yüklendi");
    } catch (error) {
      clearLocalPreview();
      setLogoPreviewUrl(
        profile.logo
          ? `/api/dashboard/brand-dna/logo?v=${encodeURIComponent(profile.updatedAt || "1")}`
          : null,
      );
      toast.error(error instanceof Error ? error.message : "Logo yüklenemedi");
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
      toast.success("Logo kaldırıldı");
    } catch {
      toast.error("Logo silinemedi");
    } finally {
      setLogoBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            Brand DNA
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
            Brand DNA
          </h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            Markanızı Score AI&apos;a öğretin. Ne kadar net tanımlarsanız analizler o
            kadar isabetli olur.
          </p>
        </div>
        {saving ? (
          <p className="text-xs font-medium text-brand-dark/40">Kaydediliyor…</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:items-stretch">
          <SectionCard title="Logo" subtitle="Marka logonuzu yükleyin.">
            <div className="flex h-full flex-col rounded-xl border border-brand-dark/10 bg-bg-offwhite p-3.5">
              <div className="relative flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-brand-dark/15 bg-white px-4 py-4">
                {logoPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreviewUrl}
                    alt="Marka logosu"
                    className="h-full w-full object-contain object-center"
                  />
                ) : (
                  <p className="text-center text-xs text-brand-dark/40">
                    Henüz logo yüklenmedi
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
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={logoBusy}
                  onClick={() => logoInputRef.current?.click()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5 disabled:opacity-50"
                >
                  <UploadCloud className="size-3.5" strokeWidth={2} />
                  {logoBusy ? "İşleniyor…" : "Logo Yükle"}
                </button>
                {profile.logo ? (
                  <button
                    type="button"
                    disabled={logoBusy}
                    onClick={() => void removeLogo()}
                    className="inline-flex items-center justify-center rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-brand-dark/60 transition-colors hover:bg-brand-dark/5 disabled:opacity-50"
                    aria-label="Logoyu kaldır"
                  >
                    <Trash2 className="size-3.5" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-center text-[11px] text-brand-dark/40">
                SVG, PNG, JPG (max. 5MB)
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Renk Paleti"
            subtitle="Markanızın ana renklerini seçin."
            right={
              <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">
                Maks. {MAX_BRAND_DNA_COLORS} renk
              </span>
            }
          >
            <div className="flex h-full flex-col">
              {colors.length > 0 ? (
                <div className="grid grid-cols-3 gap-x-4 gap-y-4">
                  {colors.map((color) => (
                    <div key={color} className="flex flex-col items-center">
                      <button
                        type="button"
                        onClick={() => removeColor(color)}
                        title={`${color} — kaldırmak için tıklayın`}
                        className="aspect-square w-full min-h-14 rounded-xl border border-brand-dark/12 sm:min-h-6"
                        style={{ backgroundColor: color }}
                      />
                      <p className="mt-1.5 w-full text-center text-[10px] font-medium tabular-nums leading-tight text-brand-dark/55">
                        {color}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-brand-dark/45">
                  Henüz renk eklenmedi. Marka paletinizi tanımlayın.
                </p>
              )}
              <div className="mt-auto space-y-1.5 pt-5">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={normalizeHexColor(colorDraft) ?? "#42B24D"}
                    onChange={(e) => {
                      const next = e.target.value.toUpperCase();
                      setColorDraft(next);
                      setColorError(null);
                    }}
                    className="size-9 shrink-0 cursor-pointer rounded-lg border border-brand-dark/12 bg-white p-1"
                    aria-label="Renk seç"
                  />
                  <input
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
                          : "Geçersiz HEX (#RGB veya #RRGGBB)",
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
                    disabled={
                      colors.length >= MAX_BRAND_DNA_COLORS ||
                      Boolean(colorError && colorDraft.trim())
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5 disabled:opacity-50"
                  >
                    <Plus className="size-3.5" strokeWidth={2.2} />
                    Ekle
                  </button>
                </div>
                {colorError ? (
                  <p className="text-[11px] font-medium text-[#D64545]">
                    {colorError}
                  </p>
                ) : (
                  <p className="text-[11px] text-brand-dark/40">
                    Format: #RGB veya #RRGGBB
                  </p>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Tipografi" subtitle="Markanın yazı stilini seçin.">
            <div className="flex h-full flex-col gap-3">
              <BrandSelect
                label="Başlık Fontu"
                value={headingFont}
                options={headingFontOptions}
                onChange={setHeadingFont}
                placeholder="Başlık fontu seçin"
                allowClear
              />
              <BrandSelect
                label="Gövde Fontu"
                value={bodyFont}
                options={bodyFontOptions}
                onChange={setBodyFont}
                placeholder="Gövde fontu seçin"
                allowClear
              />
              <div className="mt-auto rounded-lg border border-brand-dark/10 bg-bg-offwhite p-3">
                <p className="text-2xl leading-none text-brand-dark">Aa</p>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-dark/60">
                  Google Font&apos;ta aynı ailede fontlar önerilir.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-stretch">
          <SectionCard
            title="Marka Kişiliği"
            subtitle="Markanızı en iyi tanımlayan kimlikleri seçin."
            right={
              <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">
                En fazla 5 ({selectedPersonality.length}/5)
              </span>
            }
          >
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {personalityOptions.map((item) => (
                <SelectableChip
                  key={item}
                  label={item}
                  active={selectedPersonality.includes(item)}
                  onClick={() =>
                    toggleMulti(item, setSelectedPersonality, selectedPersonality, 5)
                  }
                />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Tone of Voice"
            subtitle="İletişim tonunuzu en iyi yansıtan seçimleri işaretleyin."
            right={
              <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">
                En fazla 5 ({selectedTone.length}/5)
              </span>
            }
          >
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {toneOptions.map((item) => (
                <SelectableChip
                  key={item}
                  label={item}
                  active={selectedTone.includes(item)}
                  onClick={() => toggleMulti(item, setSelectedTone, selectedTone, 5)}
                />
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-7">
            <SectionCard title="Hedef Kitle" subtitle="Hedef kitlenizi seçin.">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {targetAudience.map((audience) => {
                  const active = selectedAudience.includes(audience);
                  return (
                    <label
                      key={audience}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm text-brand-dark/70"
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() =>
                          toggleMulti(audience, setSelectedAudience, selectedAudience, 8)
                        }
                        className="size-4 shrink-0 rounded border-brand-dark/25 text-brand-dark focus:ring-brand-dark/20"
                      />
                      <span className="truncate">{audience}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3">
                <textarea
                  value={audienceNote}
                  onChange={(e) => setAudienceNote(e.target.value)}
                  placeholder="Diğer hedef kitleleri yazın..."
                  maxLength={80}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 outline-none transition-colors focus:border-brand-dark/30"
                />
                <p className="mt-1 text-right text-[11px] text-brand-dark/40">
                  {audienceNote.length}/80
                </p>
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-5">
            <SectionCard title="Sektör" subtitle="Faaliyet gösterdiğiniz sektörü seçin.">
              <div className="flex h-full flex-col justify-center gap-3">
                <BrandSelect
                  label="Ana kategori"
                  value={sectorMain}
                  options={sectorMainOptions}
                  onChange={(value) => {
                    setSectorMain(value);
                    setSectorSub("");
                  }}
                  placeholder="Ana kategori seçin"
                  allowClear
                />
                {isOtherSector ? (
                  <div className={!sectorMain ? "opacity-45" : ""}>
                    <p className="mb-1.5 text-xs font-medium text-brand-dark/55">
                      Alt kategori
                    </p>
                    <input
                      value={sectorSub}
                      onChange={(e) => setSectorSub(e.target.value)}
                      placeholder="Sektörünüzü yazın..."
                      maxLength={80}
                      disabled={!sectorMain}
                      className="w-full rounded-xl border border-brand-dark/12 bg-white px-3.5 py-2.5 text-sm font-medium text-brand-dark placeholder:font-normal placeholder:text-brand-dark/35 outline-none transition-colors focus:border-brand-dark/30 disabled:pointer-events-none disabled:cursor-not-allowed"
                    />
                  </div>
                ) : (
                  <BrandSelect
                    label="Alt kategori (opsiyonel)"
                    value={sectorSub}
                    options={sectorSubOptions}
                    onChange={setSectorSub}
                    placeholder="Alt kategori seçin"
                    allowClear
                    disabled={!sectorMain}
                  />
                )}
              </div>
            </SectionCard>
          </div>
        </div>

        <SectionCard
          title="Marka Anahtar Kelimeleri"
          subtitle="Markanızla ilişkilendirdiğiniz kelimeleri ekleyin."
          right={
            <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">
              En fazla {MAX_BRAND_DNA_KEYWORDS}
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
                  aria-label={`${keyword} anahtar kelimesini kaldır`}
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
              placeholder="Anahtar kelime ekleyin..."
              className="min-w-0 flex-1 rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/35 outline-none transition-colors focus:border-brand-dark/30"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-dark/12 bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5 sm:shrink-0"
            >
              <Plus className="size-4" strokeWidth={2} />
              Ekle
            </button>
          </div>
          <p className="mt-1 text-[11px] text-brand-dark/40">
            {keywords.length}/{MAX_BRAND_DNA_KEYWORDS} eklendi
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
                    <p className="text-xs text-brand-dark/45">/100</p>
                  </div>
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <span className="inline-flex rounded-full bg-[#42B24D]/12 px-2.5 py-1 text-xs font-semibold text-[#1D6A27]">
                    {completion.label}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-brand-dark">
                    {scoreHeadline(score, completion.label)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-dark/55">
                    {scoreDescription(score)}
                  </p>
                </div>
              </div>
              <p className="mt-auto pt-4 text-center text-xs text-brand-dark/40 sm:text-left">
                Son güncelleme: {formatUpdatedAt(profile.updatedAt)}
              </p>
            </section>
          </div>

          <div className="lg:col-span-5">
            <section className="flex h-full flex-col rounded-2xl border border-brand-dark/8 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-brand-dark">
                Tamamlanma Durumu
              </h2>
              <div className="mt-3 grid flex-1 grid-cols-1 content-start gap-1.5 sm:grid-cols-2">
                {COMPLETION_LABELS.map((item) => {
                  const status = completion.sections[item.key];
                  const done = status === "Tamamlandı";
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-2 rounded-lg bg-bg-offwhite px-2.5 py-2"
                    >
                      <span className="truncate text-sm text-brand-dark/70">
                        {item.label}
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
                        {status}
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
              <h2 className="text-sm font-semibold text-brand-dark">Neden Önemli?</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-dark/70">
                Score AI, analizleri bu referans bilgilerine göre yapar. Ne kadar
                eksiksiz tanımlarsanız, sonuçlar o kadar isabetli ve değerli olur.
              </p>
              <p className="mt-3 text-sm font-semibold text-brand-dark/70">
                Brand Intelligence skorları bu referansa göre şekillenir.
              </p>
            </section>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark/8 bg-white p-4">
        <div>
          <p className="text-base font-semibold text-brand-dark">
            {score >= 70 ? "Brand DNA'nız hazır!" : "Brand DNA'yı tamamlayın"}
          </p>
          <p className="text-sm text-brand-dark/55">
            Analizi başlatın, markanızın benzersiz kimliği doğrultusunda
            değerlendirilsin.
          </p>
        </div>
        <Link
          href="/dashboard/yeni-analiz"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Test Analizi Yap
        </Link>
      </div>
    </div>
  );
}
