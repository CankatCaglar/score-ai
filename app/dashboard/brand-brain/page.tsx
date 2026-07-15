"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Info, Plus, UploadCloud } from "lucide-react";

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

const visualStyles = [
  { id: "minimal", label: "Minimal", className: "from-[#D8EEDB] to-[#F7FBF8]" },
  { id: "editorial", label: "Editorial", className: "from-[#F4EFE8] to-[#E6D8C9]" },
  { id: "organic", label: "Organic", className: "from-[#E4F4E8] to-[#CFE6D6]" },
  { id: "luxury", label: "Luxury", className: "from-[#1D1D1F] to-[#3A393B]" },
  { id: "scandinavian", label: "Scandinavian", className: "from-[#EEF0EC] to-[#D7DDD6]" },
  { id: "corporate", label: "Corporate", className: "from-[#DDE9F4] to-[#CADCED]" },
  { id: "bold", label: "Bold", className: "from-[#0F1A13] to-[#2A3B2D]" },
  { id: "tech", label: "Tech", className: "from-[#BCCED8] to-[#8EA8B7]" },
  { id: "playful", label: "Playful", className: "from-[#F5D9D6] to-[#EFC1BE]" },
];

const targetAudience = ["B2B", "B2C", "Profesyoneller", "Ebeveynler", "Doktorlar", "Mühendisler", "Öğrenciler", "Yöneticiler"];

const initialKeywords = ["Doğal", "Bilimsel", "Güvenilir", "Temiz İçerik", "Görünürlük", "Etkin"];

const completionRows = [
  { label: "Logo", status: "Tamamlandı" },
  { label: "Renk Paleti", status: "Tamamlandı" },
  { label: "Tipografi", status: "Tamamlandı" },
  { label: "Marka Kişiliği", status: "Tamamlandı" },
  { label: "Tone of Voice", status: "Tamamlandı" },
  { label: "Görsel Stil", status: "Tamamlandı" },
  { label: "Hedef Kitle", status: "Tamamlandı" },
  { label: "Sektör", status: "Tamamlandı" },
  { label: "Anahtar Kelimeler", status: "Tamamlandı" },
];

function SectionCard({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex h-full flex-col rounded-2xl border border-brand-dark/8 bg-white p-4 sm:p-5 ${className}`}
    >
      <div className="mb-3.5 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-brand-dark">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-snug text-brand-dark/45">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function SelectableChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[#42B24D]/35 bg-[#42B24D]/15 text-[#1D6A27]"
          : "border-brand-dark/12 bg-white text-brand-dark/60 hover:border-brand-dark/25"
      }`}
    >
      {label}
    </button>
  );
}

export default function BrandBrainPage() {
  const [selectedPersonality, setSelectedPersonality] = useState<string[]>([
    "Yaratıcı",
    "Samimi",
    "Modern",
    "Sürdürülebilir",
    "Doğal",
  ]);
  const [selectedTone, setSelectedTone] = useState<string[]>([
    "Profesyonel",
    "Kendine Güvenen",
    "Samimi",
    "Dürüst",
    "İlham Verici",
  ]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([
    "minimal",
    "organic",
    "scandinavian",
  ]);
  const [selectedAudience, setSelectedAudience] = useState<string[]>([
    "B2C",
    "Profesyoneller",
  ]);
  const [keywords, setKeywords] = useState(initialKeywords);
  const [keywordInput, setKeywordInput] = useState("");
  const [audienceNote, setAudienceNote] = useState("");

  const score = 92;
  const circle = useMemo(() => {
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    return { radius, circumference, strokeDashoffset };
  }, [score]);

  const toggleMulti = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    selected: string[],
    max: number
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
    if (!value || keywords.includes(value) || keywords.length >= 10) return;
    setKeywords((prev) => [...prev, value]);
    setKeywordInput("");
  };

  return (
    <div className="space-y-5 px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">Brand DNA</h1>
          <p className="mt-1 text-sm text-brand-dark/55">
            Markanızı Score AI&apos;a öğretin. Ne kadar net tanımlarsanız analizler o kadar isabetli olur.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Görsel kimlik */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:items-stretch">
          <SectionCard title="Logo" subtitle="Marka logonuzu yükleyin.">
            <div className="flex h-full flex-col rounded-xl border border-brand-dark/10 bg-bg-offwhite p-3.5">
              <div className="flex min-h-[7.5rem] flex-1 items-center justify-center rounded-lg border border-dashed border-brand-dark/15 bg-white px-4 py-5">
                <div className="text-center">
                  <p className="text-2xl font-serif tracking-[0.22em] text-brand-dark/90 sm:text-3xl">VERDA</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.26em] text-brand-dark/40">
                    Natural Skincare
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5"
              >
                <UploadCloud className="size-3.5" strokeWidth={2} />
                Logo Yükle
              </button>
              <p className="mt-2 text-center text-[11px] text-brand-dark/40">SVG, PNG, JPG (max. 5MB)</p>
            </div>
          </SectionCard>

          <SectionCard
            title="Renk Paleti"
            subtitle="Markanızın ana renklerini seçin."
            right={
              <span className="shrink-0 text-[11px] font-medium text-brand-dark/40">Maks. 6 renk</span>
            }
          >
            <div className="flex h-full flex-col">
              <div className="grid grid-cols-3 gap-x-16 gap-y-4">
                {["#7E5A3A", "#30C27A", "#DDF2E5", "#1F3F32", "#0E0E0F", "#F2F2F3"].map((color) => (
                  <div key={color} className="flex flex-col items-center">
                    <div
                      className="aspect-square w-full min-h-14 rounded-xl border border-brand-dark/12 sm:min-h-6"
                      style={{ backgroundColor: color }}
                    />
                    <p className="mt-1.5 w-full text-center text-[10px] font-medium tabular-nums leading-tight text-brand-dark/55">
                      {color}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-dark/12 bg-white px-3 py-1.5 pt-2 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand-dark/5"
              >
                <Plus className="size-3.5" strokeWidth={2.2} />
                Renk Ekle
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Tipografi" subtitle="Markanın yazı stilini seçin.">
            <div className="flex h-full flex-col gap-3">
              <div>
                <p className="mb-1 text-[11px] font-medium text-brand-dark/55">Başlık Fontu</p>
                <select className="w-full rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-sm text-brand-dark outline-none transition-colors focus:border-brand-dark/35">
                  <option>Playfair Display</option>
                  <option>DM Serif Display</option>
                  <option>Cormorant Garamond</option>
                </select>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-medium text-brand-dark/55">Gövde Fontu</p>
                <select className="w-full rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-sm text-brand-dark outline-none transition-colors focus:border-brand-dark/35">
                  <option>Inter</option>
                  <option>Manrope</option>
                  <option>Plus Jakarta Sans</option>
                </select>
              </div>
              <div className="mt-auto rounded-lg border border-brand-dark/10 bg-bg-offwhite p-3">
                <p className="text-2xl leading-none text-brand-dark">Aa</p>
                <p className="mt-1.5 text-xs leading-relaxed text-brand-dark/60">
                  Google Font&apos;ta aynı ailede fontlar önerilir.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Kişilik & ton */}
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
                  onClick={() => toggleMulti(item, setSelectedPersonality, selectedPersonality, 5)}
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

        {/* Görsel stil */}
        <SectionCard title="Görsel Stil" subtitle="Markanızı en iyi yansıtan görselleri seçin.">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
            {visualStyles.map((style) => {
              const active = selectedStyles.includes(style.id);
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => toggleMulti(style.id, setSelectedStyles, selectedStyles, 3)}
                  className={`flex h-full flex-col overflow-hidden rounded-lg border text-left transition-colors ${
                    active
                      ? "border-[#42B24D]/45 ring-1 ring-[#42B24D]/35"
                      : "border-brand-dark/12 hover:border-brand-dark/25"
                  }`}
                >
                  <div className={`aspect-[4/3] w-full bg-linear-to-br ${style.className}`} />
                  <div className="flex min-h-[2.25rem] items-center justify-between gap-1 px-2 py-1.5">
                    <span className="truncate text-[11px] font-medium text-brand-dark/70">{style.label}</span>
                    {active && (
                      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#42B24D] text-white">
                        <CheckCircle2 className="size-2.5" strokeWidth={2.8} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {/* Hedef kitle & sektör */}
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
                        onChange={() => toggleMulti(audience, setSelectedAudience, selectedAudience, 8)}
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
                <p className="mt-1 text-right text-[11px] text-brand-dark/40">{audienceNote.length}/80</p>
              </div>
            </SectionCard>
          </div>

          <div className="lg:col-span-5">
            <SectionCard title="Sektör" subtitle="Faaliyet gösterdiğiniz sektörü seçin.">
              <div className="flex h-full flex-col justify-center gap-3">
                <div>
                  <p className="mb-1 text-[11px] font-medium text-brand-dark/55">Ana kategori</p>
                  <select className="w-full rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-sm text-brand-dark outline-none transition-colors focus:border-brand-dark/35">
                    <option>Cilt Bakımı / Kozmetik</option>
                    <option>Moda / Tekstil</option>
                    <option>Gıda / İçecek</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-medium text-brand-dark/55">Alt kategori (opsiyonel)</p>
                  <select className="w-full rounded-lg border border-brand-dark/12 bg-white px-3 py-2 text-sm text-brand-dark outline-none transition-colors focus:border-brand-dark/35">
                    <option>Skincare</option>
                    <option>Saç Bakımı</option>
                    <option>Dermokozmetik</option>
                  </select>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

        {/* Anahtar kelimeler */}
        <SectionCard
          title="Marka Anahtar Kelimeleri"
          subtitle="Markanızla ilişkilendirdiğiniz kelimeleri ekleyin."
          right={<span className="shrink-0 text-[11px] font-medium text-brand-dark/40">En fazla 10</span>}
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
                  onClick={() => setKeywords((prev) => prev.filter((item) => item !== keyword))}
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
          <p className="mt-1 text-[11px] text-brand-dark/40">{keywords.length}/10 eklendi</p>
        </SectionCard>

        {/* Özet kartları */}
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
                    <p className="text-3xl font-bold tracking-tight text-brand-dark">{score}</p>
                    <p className="text-xs text-brand-dark/45">/100</p>
                  </div>
                </div>
                <div className="min-w-0 text-center sm:text-left">
                  <span className="inline-flex rounded-full bg-[#42B24D]/12 px-2.5 py-1 text-xs font-semibold text-[#1D6A27]">
                    Mükemmel
                  </span>
                  <p className="mt-2 text-sm font-semibold text-brand-dark">Brand DNA&apos;nız güçlü ve tutarlı.</p>
                  <p className="mt-1 text-xs leading-relaxed text-brand-dark/55">
                    Bu sayede analizler daha isabetli ve içerik önerileri daha değerli olacak.
                  </p>
                </div>
              </div>
              <p className="mt-auto pt-4 text-center text-xs text-brand-dark/40 sm:text-left">
                Son güncelleme: 20 Mayıs 2025
              </p>
            </section>
          </div>

          <div className="lg:col-span-5">
            <section className="flex h-full flex-col rounded-2xl border border-brand-dark/8 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-brand-dark">Tamamlanma Durumu</h2>
              <div className="mt-3 grid flex-1 grid-cols-1 content-start gap-1.5 sm:grid-cols-2">
                {completionRows.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-2 rounded-lg bg-bg-offwhite px-2.5 py-2"
                  >
                    <span className="truncate text-sm text-brand-dark/70">{item.label}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#1D6A27]">
                      <CheckCircle2 className="size-3.5" strokeWidth={2.4} />
                      {item.status}
                    </span>
                  </div>
                ))}
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
                Score AI, analizleri bu referans bilgilerine göre yapar. Ne kadar eksiksiz tanımlarsanız,
                sonuçlar o kadar isabetli ve değerli olur.
              </p>
              <button
                type="button"
                className="mt-3 text-left text-sm font-semibold text-brand-dark underline-offset-4 hover:underline"
              >
                Daha fazla bilgi
              </button>
            </section>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-dark/8 bg-white p-4">
        <div>
          <p className="text-base font-semibold text-brand-dark">Brand DNA&apos;nız hazır!</p>
          <p className="text-sm text-brand-dark/55">
            Analizi başlatın, markanızın benzersiz kimliği doğrultusunda değerlendirilsin.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Test Analizi Yap
        </button>
      </div>
    </div>
  );
}
