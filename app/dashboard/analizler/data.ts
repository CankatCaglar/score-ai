export type Platform = "instagram" | "linkedin";

export type Category = { label: string; value: number };
export type Suggestion = { text: string; gain: number };

export type Analysis = {
  id: string;
  slug: string;
  title: string;
  platform: string;
  platformType: Platform;
  date: string;
  score: number;
  change: number;
  status: "Geliştirildi" | "İnceleniyor";
  evaluation: string;
  strength: string;
  insight: string;
  categories: Category[];
  suggestions: Suggestion[];
  contentType: string;
  criteriaCount: number;
  sectorAverage: number;
};

export const analyses: Analysis[] = [
  {
    id: "ANL-2025-0612-1432",
    slug: "terra-niva",
    title: "Terra Niva Doğal Seri Tanıtım",
    platform: "Instagram Gönderisi",
    platformType: "instagram",
    date: "12 Haziran 2025, 14:32",
    score: 84,
    change: 12,
    status: "Geliştirildi",
    evaluation:
      "İçeriğiniz güçlü bir görsel etki yaratıyor ve ürün odaklı mesajınızı net şekilde iletiyor. CTA ve hikaye anlatımı kısmında yapılacak küçük iyileştirmelerle performansınızı daha da artırabilirsiniz.",
    strength: "Görsel kalite, mesaj netliği ve marka uyumu başarılı.",
    insight:
      "Doğa temalı görseller bu içerikte etkileşimi belirgin şekilde artırmış. Aynı görsel dili gelecek içeriklerde de kullanmanız öneriliyor.",
    categories: [
      { label: "Görsel Kalite", value: 92 },
      { label: "Mesaj Netliği", value: 88 },
      { label: "CTA Gücü", value: 72 },
      { label: "Hikaye Anlatımı", value: 68 },
      { label: "Marka Uyumu", value: 90 },
    ],
    suggestions: [
      { text: "CTA metnini daha net ve eylem odaklı hale getirin.", gain: 8 },
      { text: "Ürün faydalarını vurgulayan kısa bir metin ekleyin.", gain: 6 },
      { text: "İlk 3 saniyede dikkat çekici bir başlık kullanın.", gain: 5 },
    ],
    contentType: "Gönderi",
    criteriaCount: 45,
    sectorAverage: 72,
  },
  {
    id: "ANL-2025-0611-1120",
    slug: "siskon-otomasyon",
    title: "Siskon Otomasyon Çözümü",
    platform: "LinkedIn Gönderisi",
    platformType: "linkedin",
    date: "11 Haziran 2025, 11:20",
    score: 62,
    change: -3,
    status: "İnceleniyor",
    evaluation:
      "Teknik mesajınız güçlü ancak görsel hiyerarşi zayıf kalmış. Başlık ve alt metin arasındaki kontrast artırıldığında okunabilirlik ve etkileşim yükselecektir.",
    strength: "Sektörel güven ve teknik detay iletimi iyi.",
    insight:
      "B2B içeriklerde somut istatistikler güven algısını artırıyor. Görsel sadeleştirme ile mesaj daha hızlı iletilebilir.",
    categories: [
      { label: "Görsel Kalite", value: 64 },
      { label: "Mesaj Netliği", value: 70 },
      { label: "CTA Gücü", value: 55 },
      { label: "Hikaye Anlatımı", value: 60 },
      { label: "Marka Uyumu", value: 66 },
    ],
    suggestions: [
      { text: "Görsel kontrastı ve başlık hiyerarşisini güçlendirin.", gain: 9 },
      { text: "Somut bir istatistik ile güven mesajını destekleyin.", gain: 7 },
      { text: "CTA'yı tek ve net bir eyleme indirgeyin.", gain: 5 },
    ],
    contentType: "Gönderi",
    criteriaCount: 45,
    sectorAverage: 68,
  },
  {
    id: "ANL-2025-0610-1645",
    slug: "uniba-formul",
    title: "Uniba Yeni Formül Lansmanı",
    platform: "Instagram Hikayesi",
    platformType: "instagram",
    date: "10 Haziran 2025, 16:45",
    score: 91,
    change: 15,
    status: "Geliştirildi",
    evaluation:
      "Mükemmele yakın bir içerik. Renk paleti ve tipografi marka kimliğiyle tam uyumlu, mesaj net ve etkileyici. Küçük bir interaktif dokunuş etkileşimi zirveye taşıyabilir.",
    strength: "Renk uyumu, tipografi ve duygusal etki çok güçlü.",
    insight:
      "Hikaye formatında ilk kare dikkat çekiciliği doğrudan etkiliyor. İnteraktif öğeler tamamlanma oranını yükseltiyor.",
    categories: [
      { label: "Görsel Kalite", value: 95 },
      { label: "Mesaj Netliği", value: 90 },
      { label: "CTA Gücü", value: 86 },
      { label: "Hikaye Anlatımı", value: 88 },
      { label: "Marka Uyumu", value: 94 },
    ],
    suggestions: [
      { text: "Hikaye sonuna interaktif bir anket ekleyin.", gain: 4 },
      { text: "Ürün adını ilk karede daha belirgin gösterin.", gain: 3 },
    ],
    contentType: "Hikaye",
    criteriaCount: 45,
    sectorAverage: 74,
  },
  {
    id: "ANL-2025-0609-0915",
    slug: "altinok-palet",
    title: "Altınok Palet Sürdürülebilirlik",
    platform: "LinkedIn Gönderisi",
    platformType: "linkedin",
    date: "9 Haziran 2025, 09:15",
    score: 82,
    change: 6,
    status: "Geliştirildi",
    evaluation:
      "Sürdürülebilirlik mesajı etkileyici. Görsel anlatım güçlü, sadece CTA biraz daha belirgin olduğunda dönüşüm oranı artacaktır.",
    strength: "Değer odaklı mesaj ve görsel tutarlılık iyi.",
    insight:
      "Sürdürülebilirlik temalı içerikler marka güvenini artırıyor. Somut veri paylaşımı etkileşimi güçlendiriyor.",
    categories: [
      { label: "Görsel Kalite", value: 85 },
      { label: "Mesaj Netliği", value: 84 },
      { label: "CTA Gücü", value: 70 },
      { label: "Hikaye Anlatımı", value: 80 },
      { label: "Marka Uyumu", value: 88 },
    ],
    suggestions: [
      { text: "CTA butonunu daha görünür bir renkle vurgulayın.", gain: 6 },
      { text: "Somut sürdürülebilirlik verisi paylaşın.", gain: 5 },
    ],
    contentType: "Gönderi",
    criteriaCount: 45,
    sectorAverage: 71,
  },
  {
    id: "ANL-2025-0608-1310",
    slug: "bimaks-20-yil",
    title: "Bimaks 20. Yıl Kutlama",
    platform: "Instagram Gönderisi",
    platformType: "instagram",
    date: "8 Haziran 2025, 13:10",
    score: 78,
    change: 4,
    status: "Geliştirildi",
    evaluation:
      "Kutlama teması sıcak ve samimi. Görsel yoğunluk biraz fazla; sadeleştirme ve tek odak noktası etkileşimi belirgin şekilde artırabilir.",
    strength: "Duygusal bağ ve marka mirası vurgusu güçlü.",
    insight:
      "Dönüm noktası içerikleri topluluk bağını güçlendiriyor. Sade kompozisyon mesajın hatırlanırlığını artırıyor.",
    categories: [
      { label: "Görsel Kalite", value: 80 },
      { label: "Mesaj Netliği", value: 76 },
      { label: "CTA Gücü", value: 68 },
      { label: "Hikaye Anlatımı", value: 82 },
      { label: "Marka Uyumu", value: 84 },
    ],
    suggestions: [
      { text: "Görsel yoğunluğu azaltıp tek odak noktası oluşturun.", gain: 7 },
      { text: "Başlığı kısaltarak dikkat çekiciliği artırın.", gain: 5 },
    ],
    contentType: "Gönderi",
    criteriaCount: 45,
    sectorAverage: 70,
  },
];

export function getAnalysisBySlug(slug: string): Analysis | undefined {
  return analyses.find((a) => a.slug === slug);
}

export function scoreColor(score: number): string {
  if (score >= 80) return "#00272c";
  if (score >= 60) return "#d97706";
  return "#dc2626";
}

const criteriaAspects: Record<string, string[]> = {
  "Görsel Kalite": [
    "Çözünürlük",
    "Kompozisyon",
    "Renk Uyumu",
    "Kontrast",
    "Işık Dengesi",
    "Netlik",
    "Estetik Bütünlük",
    "Görsel Hiyerarşi",
    "Marka Görselliği",
  ],
  "Mesaj Netliği": [
    "Başlık Gücü",
    "Ana Mesaj",
    "Okunabilirlik",
    "Dil Sadeliği",
    "Ton Tutarlılığı",
    "Bilgi Yoğunluğu",
    "Anlaşılırlık",
    "Slogan Etkisi",
    "Alt Metin",
  ],
  "CTA Gücü": [
    "CTA Varlığı",
    "Eylem Netliği",
    "Konumlandırma",
    "Görünürlük",
    "Aciliyet",
    "Fayda Vurgusu",
    "Buton Tasarımı",
    "İkna Gücü",
    "Yönlendirme",
  ],
  "Hikaye Anlatımı": [
    "Giriş Etkisi",
    "Akış",
    "Duygusal Bağ",
    "Özgünlük",
    "Merak Uyandırma",
    "Marka Sesi",
    "Ritim",
    "Kapanış",
    "Mesaj Bütünlüğü",
  ],
  "Marka Uyumu": [
    "Logo Kullanımı",
    "Renk Paleti",
    "Tipografi",
    "Ton",
    "Değer Uyumu",
    "Tutarlılık",
    "Kimlik Yansıması",
    "Görsel Dil",
    "Hatırlanırlık",
  ],
};

export type CriterionGroup = {
  category: string;
  average: number;
  items: { label: string; value: number }[];
};

export function buildCriteria(analysis: Analysis): CriterionGroup[] {
  return analysis.categories.map((cat) => {
    const aspects = criteriaAspects[cat.label] ?? [];
    const items = aspects.map((label, i) => {
      const variation = ((i * 7) % 11) - 5;
      const value = Math.max(20, Math.min(100, cat.value + variation));
      return { label, value };
    });
    return { category: cat.label, average: cat.value, items };
  });
}
