# Score AI - İlerleme Durumu

> **Bu dosya projenin güncel teknik ve ürün durumunu takip eder.**
> Her anlamlı geliştirmeden sonra güncellenmelidir.
> Ürün vizyonu ve uzun vadeli hedefler için bkz. [README.md](./README.md)

**Son güncelleme:** 8 Temmuz 2026
**Mevcut faz:** Faz 0 — Landing Page + Dashboard UI iskeleti

---

## Hızlı Özet


| Alan                                       | Durum                         |
| ------------------------------------------ | ----------------------------- |
| Landing page (waitlist)                    | Tamamlandı (UI)               |
| Dashboard iskeleti + Genel Bakış           | Tamamlandı (mock veri)        |
| Dashboard alt sayfaları                    | İskelet (placeholder)         |
| Upload modal (UI)                          | Tamamlandı (mantık yok)       |
| Screenshot sistemi (`public/screenshots/`) | Tamamlandı                    |
| Firebase entegrasyonu                      | Başlanmadı                    |
| Auth (Login / Signup)                      | Başlanmadı (landing'de pasif) |
| Waitlist backend                           | Başlanmadı (form mock)        |
| OpenAI analiz motoru                       | Başlanmadı                    |
| OAuth (sosyal medya bağlama)               | Planlandı (ileri faz)         |


---



## Kurulum ve Çalıştırma

```bash
npm install
npm run dev
```


| URL                                                                | Sayfa                   |
| ------------------------------------------------------------------ | ----------------------- |
| [http://localhost:3000](http://localhost:3000)                     | Landing page (waitlist) |
| [http://localhost:3000/dashboard](http://localhost:3000/dashboard) | Dashboard (Genel Bakış) |


```bash
npm run build
npm run lint
```



### Screenshot güncelleme

Landing ve pazarlama bloklarındaki görseller `public/screenshots/` altına konur; dosya adları sabit kalır:


| Dosya                           | Kullanım yeri                                        |
| ------------------------------- | ---------------------------------------------------- |
| `dashboard-hero.png`            | Hero bölümü (sağ)                                    |
| `dashboard-brand-brain.png`     | Özellikler > Brand Brain görsel alanı                |
| `dashboard-benchmark.png`       | Özellikler > Benchmark görsel alanı                  |
| `dashboard-creative-memory.png` | Özellikler > Creative Memory görsel alanı            |
| `dashboard-video.png`           | MacBook demo bölümü                                  |
| `analysis-current.png`          | AI Sadece Puan Vermez > Mevcut kart içi görsel       |
| `analysis-suggested.png`        | AI Sadece Puan Vermez > Önerilen kart içi görsel     |
| `feature-pill-1..6.png`         | Özellikler > 6'lı yatay feature pill ikon görselleri |
| `audience-card-1..5.png`        | Kimler Kullanmalı > 5 kart görsel alanı              |
| `final-stat-icon-1..4.png`      | Son Adım > 4'lü istatistik kartı görsel ikonları     |
| `footer-quote-image.png`        | Koyu quote bloğu (footer üstü sol görsel)            |


Görsel değiştirdikten sonra tarayıcıda hard refresh (`Cmd+Shift+R`) yeterlidir. Bileşen native `<img>` kullanır; Next.js image cache sorunu yaşanmaz.

---



## Teknoloji Yığını (Güncel)



### Kullanımda


| Paket                | Sürüm   | Kullanım                              |
| -------------------- | ------- | ------------------------------------- |
| Next.js (App Router) | 16.2.10 | Routing, layout, sayfa yapısı         |
| React                | 19.2.4  | UI bileşenleri                        |
| Tailwind CSS         | v4      | Stil sistemi                          |
| TypeScript           | 5.x     | Tip güvenliği                         |
| framer-motion        | 12.42.2 | Landing scroll animasyonları (FadeIn) |
| recharts             | 3.9.2   | Dashboard grafikleri                  |
| lucide-react         | 1.23.0  | İkonlar                               |
| Inter (Google Fonts) | -       | Varsayılan tipografi                  |




### Kurulu, henüz entegre edilmedi


| Paket    | Sürüm   | Planlanan kullanım       |
| -------- | ------- | ------------------------ |
| Firebase | 12.15.0 | Auth, Firestore, Storage |




### Planlanan (henüz kurulmadı)

- **OpenAI GPT-4o** — İçerik analizi, puanlama, öneri üretimi

---



## Tasarım Sistemi



### Renkler


| Token       | Hex     | Kullanım                     |
| ----------- | ------- | ---------------------------- |
| brand-dark  | #00272c | Header, koyu bölümler, metin |
| brand-neon  | #e1ff51 | CTA, badge, vurgular         |
| bg-light    | #ffffff | Hero, açık kartlar           |
| bg-offwhite | #ffffef | Alternatif açık bölümler     |




### Tipografi

- Font: **Inter** (app/layout.tsx) + Neue Montreal / Syne fallback (tailwind.config.ts)
- Dil: `lang="tr"`
- Metadata: `title: Score AI` ✓



### UI Dili

- Landing: koyu/açık bölüm alternansı, neon vurgular, framer-motion fade-in
- Dashboard: Apple / Linear tarzı — sade, bol boşluk, yuvarlatılmış kartlar
- Layout genişliği: `max-w-[1580px]` + responsive yatay padding (`PAGE_CONTAINER`)

---



## Dosya Yapısı (Güncel)

```text
score-ai/
  app/
    layout.tsx              # Root layout, metadata
    page.tsx                # Landing page (waitlist)
    globals.css
    dashboard/
      layout.tsx            # Sidebar, header, upload modal
      page.tsx              # Genel Bakış (grafikler, mock veri)
      analizler/page.tsx    # Placeholder
      brand-brain/page.tsx  # Placeholder
      benchmark/page.tsx    # Placeholder
      icgoruler/page.tsx    # Placeholder
      takim/page.tsx        # Placeholder
      ayarlar/page.tsx      # Placeholder
  components/
    landing/
      DashboardScreenshot.tsx  # Screenshot + MacbookFrame
  public/
    logo.svg                # Tekil güncel logo
    screenshots/            # Landing ve pazarlama görselleri
  tailwind.config.ts
  ILERLEME.md
  README.md
  package.json
```

---



## Tamamlanan Özellikler



### 1. Landing Page (`app/page.tsx`)

**Header (sabit)**

- 3 sütunlu grid: logo (sol) · nav (orta) · Waitlist CTA (sağ)
- Logo tıklanabilir → sayfa başına smooth scroll
- Login / Signup kaldırıldı (pasif mock yok)
- Fiyatlandırma nav linki pasif (disabled)

**Bölümler (sırayla)**


| #   | Bölüm                             | Arka plan  | Notlar                                                                |
| --- | --------------------------------- | ---------- | --------------------------------------------------------------------- |
| 1   | Hero                              | bg-light   | 1/3 metin + 2/3 dashboard screenshot                                  |
| 2   | İçeriğinizi daha iyi hale getirir | offwhite   | Mevcut/Önerilen kartlar, iyileştirme listesi, Canva butonu            |
| 3   | Daha iyi içerik için her şey      | brand-dark | Brand Brain, Benchmark, Creative Memory (zig-zag) + 6 yatay pill kart |
| 4   | 60 saniyede izleyin               | offwhite   | MacBook mockup + Play butonu                                          |
| 5   | 5 adımda optimize edin            | offwhite   | Beyaz kart yapısına çekilmiş süreç kartları                           |
| 6   | Kimler kullanmalı                 | offwhite   | 5 hedef kitle kartı                                                   |
| 7   | FAQ                               | brand-dark | 5 soruluk accordion                                                   |
| 8   | Son adım                          | offwhite   | Waitlist CTA + istatistik barı                                        |
| 9   | Koyu quote                        | brand-dark | Sol görsel alanı + sağ quote badge ve metin                           |
| 10  | Footer                            | brand-dark | Logo, link kolonları, SCORE watermark                                 |


**Hero metinleri (güncel)**

- Başlık: *İçeriğinizin kalitesini ölçün. Otomatik geliştirin.*
- Alt başlık: 45 mikro kriter, marka öğrenimi, otomatik öneriler
- Sosyal kanıt: 1.000+ içerik üreticisi, pazarlama ekibi ve ajans...

**Waitlist formu**

- E-posta validasyonu (client-side, `@` + `.com`)
- Henüz backend yok — buton mock



### 2. `DashboardScreenshot` bileşeni

- `variant`: `hero` | `section` | `video` — sabit aspect ratio container
- `section` için `object-contain`, diğerleri `object-fill`
- Native `<img>` — dosya değişince anında yansır
- `MacbookFrame` — video bölümü için laptop çerçevesi



### 2.1 Landing tasarım revizyonları (8 Tem)

- Hero başlığı, metin kontrastı ve sağ görsel arka planı sadeleştirildi
- "AI Sadece Puan Vermez" kartları yeniden oranlandı, görsel slotları eklendi
- Alt iyileşme bandı badge + metrik + mini chart düzenine geçirildi
- "Nasıl Çalışıyor" kartları beyaz kart temasına taşındı, içerikler detaylandırıldı
- "Kimler Kullanmalı" ve "Son Adım" kartlarında ikonlar görsel slotlarına dönüştürüldü



### 3. Dashboard iskeleti (`app/dashboard/`)

- Sidebar navigasyon (7 menü öğesi)
- Header (sayfa başlığı, Yeni Analiz, bildirim, profil)
- Upload modal (sadece UI)
- Responsive mobil sidebar



### 4. Genel Bakış ekranı (Recharts, mock veri)

**Üst satır (1:1)**

- Toplam Score: dairesel ilerleme halkası (84/100)
- Score Trendi: AreaChart + Line (20 May – 17 Haz)

**Orta satır (4 istatistik kartı)**

- Analiz Edilen İçerik (128, +32%)
- Ortalama Score (84/100, +8%)
- En Güçlü Kategori (Görsel Kalite, 26/30)
- İyileşme Oranı (+14%)

**Alt satır (1:2)**

- Score Dağılımı: donut chart + legend
- Son Analizler: 3 satırlık liste



### 5. Upload modal (sadece UI)

- `isUploadModalOpen` state ile aç/kapa
- Sürükle-bırak alanı, URL input, Analiz Et butonu
- Henüz yok: dosya yükleme, Firebase Storage, analiz tetikleme

---



## Yapılmadı / Sırada



### Landing

- [ ] Waitlist form backend (e-posta kayıt API / Firebase)
- [ ] Fiyatlandırma bölümü (şu an nav pasif)
- [ ] Video demo gerçek embed (Play butonu mock)
- [ ] Login / Signup sayfaları (ileride)



### Dashboard

- [ ] Alt sayfa içerikleri (Analizler, Brand Brain, Benchmark, İçgörüler, Takım, Ayarlar)
- [ ] Upload modal dosya seçme ve Storage yükleme
- [ ] Gerçek veri bağlantısı (mock → Firestore)



### Altyapı

- [ ] Firebase yapılandırması (.env, Auth, Firestore, Storage)
- [ ] OpenAI GPT-4o entegrasyonu
- [ ] OAuth ile sosyal medya hesap bağlama

---



## Geliştirme Günlüğü


| Tarih      | Yapılan                                                                                 |
| ---------- | --------------------------------------------------------------------------------------- |
| 5 Tem 2026 | Proje başlangıcı, README oluşturuldu                                                    |
| 5 Tem 2026 | Tasarım sistemi: Tailwind renkleri, Inter font                                          |
| 5 Tem 2026 | Dashboard iskeleti                                                                      |
| 5 Tem 2026 | Genel Bakış ekranı ve Recharts grafikleri                                               |
| 5 Tem 2026 | Score Dağılımı kartı düzenlemeleri                                                      |
| 5 Tem 2026 | Upload modal UI eklendi                                                                 |
| 5 Tem 2026 | ILERLEME.md oluşturuldu                                                                 |
| 7 Tem 2026 | Landing page tamamlandı (10 bölüm + footer)                                             |
| 7 Tem 2026 | `MiniDashboard` kaldırıldı → `DashboardScreenshot` + `public/screenshots/`              |
| 7 Tem 2026 | Hero layout: 1/3 metin + 2/3 görsel, metinler güncellendi                               |
| 7 Tem 2026 | Header: 3 sütun grid, login/signup kaldırıldı, logo büyütüldü ve tıklanabilir           |
| 7 Tem 2026 | `PAGE_CONTAINER` (max-w-1440px) tüm bölümlere uygulandı                                 |
| 7 Tem 2026 | Screenshot cache sorunu çözüldü (native img, Next Image cache bypass)                   |
| 7 Tem 2026 | Dashboard alt sayfa rotaları eklendi (placeholder)                                      |
| 7 Tem 2026 | framer-motion FadeIn animasyonları landing'e eklendi                                    |
| 7 Tem 2026 | ILERLEME.md güncellendi                                                                 |
| 8 Tem 2026 | Landing'in neredeyse tüm bölümlerinde görsel düzen, tipografi ve renk revizyonu yapıldı |
| 8 Tem 2026 | Özellikler zig-zag blokları gerçek screenshot slotlarıyla güncellendi                   |
| 8 Tem 2026 | "AI Sadece Puan Vermez" alanı yeniden kurgulandı (oran, tipografi, görseller)           |
| 8 Tem 2026 | "Nasıl Çalışıyor" kartları referans tasarıma göre detay bloklarla genişletildi          |
| 8 Tem 2026 | "Kimler Kullanmalı", "Son Adım" ve 6'lı feature pill ikonları PNG slotlarına taşındı    |
| 8 Tem 2026 | Footer üstü koyu quote blokta sol kart kaldırıldı, yerine görsel alanı eklendi          |


---



## Güncelleme Kuralı

Her ilerlemede şunları güncelle:

1. Son güncelleme tarihi ve Mevcut faz
2. Hızlı Özet tablosu
3. Tamamlanan Özellikler veya Yapılmadı / Sırada listesi
4. Geliştirme Günlüğü bölümüne yeni satır
5. Gerekirse Dosya Yapısı ve Teknoloji Yığını

