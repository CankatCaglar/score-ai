"use client";

import { ArrowUpRight, Bookmark, Sparkles, TrendingUp } from "lucide-react";

const savedCreatives = [
  {
    title: "Doğadan Gelen Saf Bakım",
    tag: "Yeşil ton • Doğa teması",
    score: 91,
    note: "En yüksek etkileşimi alan görsel dili.",
  },
  {
    title: "Minimal Ürün Lansmanı",
    tag: "Sade kompozisyon",
    score: 88,
    note: "Tek odak noktası dikkat çekiciliği artırdı.",
  },
  {
    title: "Sürdürülebilirlik Hikayesi",
    tag: "Değer odaklı mesaj",
    score: 84,
    note: "Duygusal bağ kuran anlatım tarzı.",
  },
  {
    title: "20. Yıl Kutlaması",
    tag: "Sıcak & samimi",
    score: 82,
    note: "Marka mirası vurgusu güçlü performans gösterdi.",
  },
];

const patterns = [
  { label: "Doğa temalı görseller", detail: "%21 daha fazla etkileşim" },
  { label: "Kısa ve net başlıklar", detail: "%18 daha yüksek okunma" },
  { label: "Yüksek kontrastlı CTA", detail: "%14 daha fazla tıklama" },
];

export default function CreativeMemoryPage() {
  return (
    <div className="px-4 pb-8 pt-2 sm:px-6 lg:px-8 lg:pt-4">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-dark">
          Creative Memory
        </h1>
        <p className="mt-1 text-sm text-brand-dark/55">
          En iyi performans gösteren içeriklerinizi ve tekrarlayan başarılı
          desenleri Score AI hatırlar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-3xl bg-bg-light p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Bookmark className="size-5 text-brand-dark" strokeWidth={1.75} />
              <h2 className="text-base font-semibold text-brand-dark">
                Kaydedilen Kreatifler
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {savedCreatives.map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-brand-dark/8 p-4 transition-colors hover:border-brand-dark/20"
                >
                  <div className="aspect-video w-full rounded-xl bg-bg-offwhite" />
                  <div className="mt-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-dark">
                        {c.title}
                      </p>
                      <p className="mt-0.5 text-xs text-brand-dark/45">{c.tag}</p>
                    </div>
                    <div className="flex shrink-0 items-baseline">
                      <span className="text-lg font-bold text-brand-dark">
                        {c.score}
                      </span>
                      <span className="text-xs font-medium text-brand-dark/30">
                        /100
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-snug text-brand-dark/55">
                    {c.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-bg-light p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-brand-dark" strokeWidth={1.75} />
              <h2 className="text-base font-semibold text-brand-dark">
                Başarılı Desenler
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {patterns.map((p) => (
                <div
                  key={p.label}
                  className="rounded-2xl bg-bg-offwhite px-4 py-3"
                >
                  <p className="text-sm font-medium text-brand-dark">{p.label}</p>
                  <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-brand-dark">
                    <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
                    {p.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-brand-dark p-6 text-white">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand-neon/20">
              <Sparkles className="size-5 text-brand-neon" strokeWidth={1.75} />
            </div>
            <p className="mt-4 text-sm font-semibold text-brand-neon">
              Score AI Önerisi
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              Yeni içeriklerinizde doğa teması ve kısa başlık kombinasyonunu
              kullanmaya devam edin — bu desen markanız için en yüksek
              etkileşimi sağlıyor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
