# Score AI — İlerleme Durumu

> Bu dosya, projenin **operasyonel durumunu** kısa ve net takip etmek için tutulur.  
> Ürün vizyonu için: [README.md](./README.md)

**Son güncelleme:** 18 Temmuz 2026  
**Mevcut faz:** Faz 2.1 — Dashboard Gerçek Veri + AI Analiz Pipeline + Operasyonel Stabilizasyon

---

## 1) Yönetici Özeti

| Alan | Durum | Not |
| --- | --- | --- |
| Landing (public) | ✅ Canlı | TR/EN dil seçimi, responsive, waitlist formları |
| Waitlist backend | ✅ Canlı | Firestore + deterministic ID + opsiyonel SMTP |
| Admin panel (`/admin`) | ✅ Canlı | Waitlist operasyonları + blog yönetimi |
| Blog (`/blog`) | ✅ Canlı | Public blog liste/detay + admin editoryal akış |
| Erken erişim davet akışı | ✅ Canlı | Token tabanlı invite link, tek kullanımlık doğrulama |
| Dashboard erişim kontrolü | ✅ Canlı | `waitlist`/`early_access` modları + admin bypass |
| Dashboard veri katmanı | ✅ Canlı | Liste, detay, overview ve sonuç ekranları Firestore + API ile gerçek veriden besleniyor |
| AI analiz motoru (prod) | ✅ Canlı | Anthropic kategori analizi + rubric tabanlı deterministic skor hesaplama |

---

## 2) Canlı Kapsam (Şu an çalışanlar)

### 2.1 Public taraf
- Landing page (TR/EN) + pazarlama blokları + video modal
- Hero ve footer waitlist formları
- `access` query paramına göre kullanıcıya erişim durumu toast mesajları
- Footer aksiyonları (`mailto`, Google Maps) + blog linkleri

### 2.2 Waitlist backend
- `actions/waitlist.ts` ile Firestore `waitlist` koleksiyonuna kayıt
- Aynı e-posta için deterministic `waitlistId` ve merge davranışı
- SMTP tanımlıysa hoş geldin e-postası, yoksa kayıt akışı kesintisiz devam

### 2.3 Admin operasyon paneli
- Güvenli giriş (`/admin/login`) + imzalı oturum cookie
- Waitlist ekranı:
  - listeleme
  - en yeni / en eski sıralama
  - e-posta veya ID arama
  - dil filtresi (`TR` / `EN`)
  - tekil kayıt silme
  - CSV / Word / PDF export
- Blog ekranı:
  - yazı oluşturma / düzenleme
  - taslak / yayında durumu
  - öne çıkarma
  - silme
  - basit rich-text editör

### 2.4 Blog altyapısı
- Public: `/blog` (liste) ve `/blog/[slug]` (detay)
- Firestore `blog_posts` koleksiyonundan sadece yayınlanan yazıların gösterimi
- Slug tabanlı metadata (title/description/OpenGraph)
- Yazı içeriği için okuma süresi hesaplama
- Opsiyonel Google Translate API ile otomatik çeviri alanı üretimi

### 2.5 Erken erişim davet akışı
- `scripts/generate-early-access-links.mjs` ile waitlist kayıtlarından davet link üretimi
- `early_access_invites` koleksiyonunda hash tabanlı token saklama
- `/invite/[token]` route'u ile:
  - token doğrulama
  - tek kullanım kontrolü
  - süre dolumu kontrolü
  - başarılıysa early access cookie set edilip `/dashboard` yönlendirmesi

### 2.6 Dashboard modları
- `proxy.ts` ile dashboard erişimi mode bazlı korunuyor:
  - `APP_ACCESS_MODE=waitlist`: dashboard'a public erişim yok, landing'e yönlendirme
  - `APP_ACCESS_MODE=early_access`: yalnız davet cookie'si olan kullanıcı erişir
- Admin oturumu olan kullanıcılar dashboard'a doğrudan erişebilir
- `/admin-dashboard` path'i rewrite ile `/dashboard` altına bağlanır

### 2.7 Dashboard veri ve analiz katmanı (yeni)
- Gerçek API endpoint'leri:
  - `/api/dashboard/overview`
  - `/api/dashboard/analyses` (+ filtre/paginasyon/silme)
  - `/api/dashboard/analyses/[slug]`
  - `/api/dashboard/result`
  - `/api/dashboard/media/[analysisId]`
- `Yeni Analiz` akışı:
  - `/api/analysis-jobs` ile dosya/URL alımı
  - Firebase Storage yükleme + Firestore job oluşturma
  - `processPendingAnalysisJobs()` ile kuyruğun işlenmesi
- AI pipeline:
  - 5 ana kategori için ayrı prompt çalıştırma
  - Anthropic modelinden 31 kriterde `seviye + açıklama + aksiyon` üretimi
  - Skorların AI'dan değil rubric algoritmasından hesaplanması (`currentScore`, `potentialScore`, kategori/mikro skorlar)
- Caching:
  - Görsel fingerprint + model + rubric/prompt version + platform + brand context hash ile cache key üretimi
  - Aynı input için tekrar AI çağrısını azaltma
- Stabilizasyon:
  - Görsel formatını byte-level doğrulama (PNG/JPEG/JPG/WEBP/GIF)
  - `jobStatus` (pending/processing/completed/failed) UI/API akışına yansıtıldı
  - Başarısız analizde 0 puan ekranına düşmek yerine anlamlı hata mesajı

---

## 3) Teknik Mimari (Özet)

### Frontend / App
- Next.js 16 (App Router + Proxy convention)
- React 19 + TypeScript
- Tailwind CSS v4
- Framer Motion, Lucide, Sonner, Recharts
- Vercel Analytics + Yandex Metrica script entegrasyonu

### Data & Backend
- Firebase Firestore (`waitlist`, `blog_posts`, `early_access_invites`, `analyses`, `analysis_jobs`, `content_items`, `analysis_revisions`, `analysis_cache`)
- Firebase Admin SDK (sunucu tarafı admin işlemleri)
- Server Actions:
  - waitlist kayıt akışı
  - admin waitlist operasyonları
  - blog CRUD ve yayın yönetimi
- API routes:
  - Dashboard query katmanı (overview/liste/detay/sonuç/media)
  - Analysis job ingestion + internal worker endpoint
- Anthropic SDK tabanlı kategori analiz servisi (`lib/ai/anthropic.ts`)
- Rubric/puanlama motoru (`lib/analysis/rubric.ts`) ile deterministic skor üretimi
- Nodemailer (opsiyonel SMTP)
- jsPDF + AutoTable (PDF export)

### Güvenlik
- Admin oturumu: imzalı `httpOnly` cookie (`scoreai_admin`)
- Erken erişim oturumu: imzalı `httpOnly` cookie (`score_early_access`)
- Route koruması: `proxy.ts`
- Action seviyesinde ikinci doğrulama: `requireAdmin()`
- Firestore kuralları:
  - `waitlist`: create açık, read/update/delete client'ta kapalı
  - `blog_posts`: sadece `published` içerikler okunabilir, write kapalı

---

## 4) Çalıştırma

```bash
npm install
npm run dev
```

**Lokal URL'ler**
- `http://localhost:3000` → Landing
- `http://localhost:3000/blog` → Public blog
- `http://localhost:3000/dashboard` → İç ürün UI (mode'a bağlı)
- `http://localhost:3000/admin/login` → Admin girişi
- `http://localhost:3000/admin` → Admin panel

Kalite kontrol:

```bash
npm run lint
npm run build
```

---

## 5) Kritik Konfigürasyon Notları

### 5.1 Temel Firebase env (client)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### 5.2 Admin panel için zorunlu env
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

### 5.3 Erken erişim ve davet akışı
- `APP_ACCESS_MODE` (`waitlist` veya `early_access`)
- `EARLY_ACCESS_SESSION_SECRET` (opsiyonel; yoksa `ADMIN_SESSION_SECRET` fallback)
- `APP_BASE_URL` (invite link üretimi için)
- `EARLY_ACCESS_INVITE_EXPIRY_DAYS` (opsiyonel)

### 5.4 Opsiyonel env
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Çeviri: `GOOGLE_TRANSLATE_API_KEY`
- AI: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_TIMEOUT_MS`
- Worker: `ANALYSIS_WORKER_SECRET`

> Not: `.env.local` veya service account JSON dosyaları repository'ye commit edilmez.

---

## 6) Sıradaki Öncelikler (Kısa Roadmap)

### P1 — Ürünleşme (aktif)
- Dashboard için gerçek `sectorAverage` ve benchmark metodolojisinin devreye alınması
- `AI insight` metinlerinin çoklu şablon/ton ve daha güçlü veri anlatımıyla zenginleştirilmesi
- Video input için ya tam destek (frame extraction) ya da ürün seviyesinde net kısıtlama

### P1 — Güvenlik ve Operasyon
- Admin login için rate limit / brute-force koruması
- Admin aksiyonları ve invite kullanımına audit log
- Invite yönetimi için iptal/yenileme panel aksiyonları

### P2 — AI Katmanı
- Rubric/prompt versiyonlamayı yönetim ekranına taşıma (operasyonel görünürlük)
- İçgörü ve öneri kalitesini ölçen internal eval akışı
- Retry/backoff + job orchestration metriklerinin üretim izlenebilirliği

---

## 7) Kısa Değişiklik Günlüğü

| Tarih | Özet |
| --- | --- |
| 5 Tem 2026 | Proje kurulum, tasarım sistemi, dashboard iskeleti, ilk ILERLEME |
| 7 Tem 2026 | Landing ana yapı tamamlandı, screenshot altyapısı ve dashboard route'ları eklendi |
| 8 Tem 2026 | Landing görsel/UX revizyonları ve pazarlama blokları genişletildi |
| 10 Tem 2026 | Waitlist backend v1 (Firestore + SMTP opsiyon), responsive hardening |
| 11 Tem 2026 | Admin panel v1: güvenli giriş, listeleme/silme, export (CSV/Word/PDF) |
| 13-15 Tem 2026 | Blog altyapısı (public + admin CMS), erken erişim invite akışı, dashboard access mode ve proxy güncellemeleri |
| 18 Tem 2026 | Dashboard mock’tan gerçek veriye geçirildi; analysis jobs + worker + Anthropic kategori analizi + rubric skor hesaplama canlıya alındı |
| 18 Tem 2026 | `monthChange` ve `AI insight` gerçek veri mantığına alındı; insight kartında 3 satır kesme/expand UX eklendi |
| 18 Tem 2026 | Görsel format doğrulaması sertleştirildi; `jobStatus` UI/API akışına işlendi, başarısız analizde yanlış 0 skor ekranı engellendi |

---

## 8) Doküman Güncelleme Kuralı

Her anlamlı geliştirmeden sonra şu 4 başlık güncellenir:
1. Mevcut faz + yönetici özeti
2. Canlı kapsam / teknik mimari (değiştiyse)
3. Roadmap öncelikleri
4. Kısa değişiklik günlüğü

