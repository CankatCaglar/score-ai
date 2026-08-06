# Score AI — İlerleme Durumu

> Bu dosya, projenin **operasyonel durumunu** kısa ve net takip etmek için tutulur.  
> Ürün vizyonu için: [README.md](./README.md)

**Son güncelleme:** 6 Ağustos 2026  
**Mevcut faz:** Faz 2.3 — Public Grader + Brand DNA + Ürün Operasyonu

---

## 1) Yönetici Özeti

| Alan | Durum | Not |
| --- | --- | --- |
| Landing (public) | ✅ Canlı | TR/EN, responsive, waitlist, live support, cookie consent |
| Waitlist backend | ✅ Canlı | Firestore + deterministic ID + opsiyonel SMTP |
| Admin panel (`/admin`) | ✅ Canlı | Waitlist operasyonları + blog yönetimi |
| Blog (`/blog`) | ✅ Canlı | Public blog liste/detay + admin editoryal akış |
| Erken erişim davet akışı | ✅ Canlı | Token tabanlı invite link, tek kullanımlık doğrulama |
| End-user auth | ✅ Canlı | `/giris`, şifre sıfırlama, e-posta doğrulama, Google |
| Dashboard erişim kontrolü | ✅ Canlı | `APP_ACCESS_MODE` (`waitlist` / `early_access` / `public`) |
| Dashboard veri katmanı | ✅ Canlı | Liste, detay, overview ve sonuç ekranları Firestore + API |
| AI analiz motoru (prod) | ✅ Canlı | Anthropic kategori analizi + rubric skor |
| Public Grader / Analyzer | ✅ Canlı | Misafir upload + e-posta capture + public rapor; claim → hesap |
| Brand DNA (`/dashboard/brand-brain`) | ✅ Canlı | Profil editörü + logo; analiz prompt context’e entegre |
| Brand Intelligence / Benchmark | ✅ Canlı (UI+API) | Marka vaadi, rakipler, güven kanıtları, geçmiş içerik |
| Instagram marka hesabı bağlama | 🟡 Kısmi canlı | Instagram Login OAuth hazır; Meta Advanced Access onay bekliyor |
| Bildirimler | ✅ Canlı | Dashboard bell + tercihler + analiz toast / product tips |
| Cookie consent + analytics | ✅ Canlı | Consent-gated Vercel Analytics, Yandex Metrica, Meta Pixel |
| Privacy / legal sayfaları | ✅ Canlı | `/privacy`, `/gizlilik-politikasi` |

---

## 2) Canlı Kapsam (Şu an çalışanlar)

### 2.1 Public taraf
- Landing page (TR/EN) + pazarlama blokları + video modal + dashboard screenshot’lar
- Hero ve footer waitlist formları
- `access` query paramına göre kullanıcıya erişim durumu toast mesajları
- Footer aksiyonları (`mailto`, Google Maps) + blog linkleri
- WhatsApp live support widget (`LiveSupportWidget`)
- Cookie consent banner + consent-gated analytics/marketing script’leri
- Meta domain doğrulama meta tag (`facebook-domain-verification` → `app/layout.tsx`)

### 2.2 Waitlist backend
- `actions/waitlist.ts` ile Firestore `waitlist` koleksiyonuna kayıt
- Aynı e-posta için deterministic `waitlistId` ve merge davranışı
- SMTP tanımlıysa hoş geldin e-postası, yoksa kayıt akışı kesintisiz devam

### 2.3 Admin operasyon paneli
- Güvenli giriş (`/admin/login`) + imzalı oturum cookie
- Waitlist: listeleme, sıralama, arama, dil filtresi, silme, CSV/Word/PDF export
- Blog: oluşturma / düzenleme / taslak-yayın / öne çıkarma / silme

### 2.4 Blog altyapısı
- Public: `/blog` (liste) ve `/blog/[slug]` (detay)
- Firestore `blog_posts` — yalnız yayınlanan yazılar
- Slug metadata + okuma süresi + opsiyonel Translate API

### 2.5 Erken erişim davet akışı
- `scripts/generate-early-access-links.mjs` ile davet link üretimi
- `/invite/[token]` doğrulama + tek kullanım + süre kontrolü

### 2.6 End-user auth
- `/giris` — e-posta/şifre + Google
- `/sifremi-unuttum`, `/email-dogrula`, `/auth/action`
- İmzalı user session cookie (`USER_SESSION_SECRET`)
- Grader misafir analizlerini hesaba claim etme (`lib/grader/claim.ts`)

### 2.7 Dashboard modları
- `proxy.ts` ile mode bazlı koruma:
  - `waitlist` / `early_access` / `public`
- Admin oturumu dashboard’a bypass eder
- Varsayılan (unset): `waitlist`

### 2.8 Dashboard veri ve analiz katmanı
- API: overview, analyses (+ filtre/paginasyon/silme), result, media, potential-image
- `Yeni Analiz` → `/api/analysis-jobs` + worker kuyruğu
- Anthropic 5 kategori + rubric deterministic skor
- Cache (fingerprint + model + rubric/prompt version + brand context)
- `jobStatus` UI/API; başarısız analizde yanlış 0 skor engeli
- Sonuç ekranı (`/dashboard/analiz-sonucu`): skor kırılımı, potential, AI yorum, sosyal paylaşım
- Creative Memory: geçmiş analizler + detay (`/dashboard/creative-memory`)

### 2.9 Public Grader / Analyzer (yeni)
- Sayfalar: `/[locale]/analyzer`, `/[locale]/analyzer/[slug]`
- API: `/api/grader/jobs`, `/status`, `/result`, `/media/[analysisId]`
- Misafir upload → e-posta capture → analiz job → public rapor
- Guest cookie + lock cookie; giriş sonrası analizleri hesaba taşıma
- Guest/grader akışı Brand DNA / Benchmark context’ini bilinçli olarak atlar (image-only yüzey)
- Lead kaydı (`lib/grader/leads.ts`) + grader e-posta şablonları

### 2.10 Brand DNA (yeni)
- Sayfa: `/dashboard/brand-brain`
- API: `/api/dashboard/brand-dna`, `/api/dashboard/brand-dna/logo`
- Alanlar: vaat, renkler, tipografi, kişilik, ton, kitle, sektör, keywords, logo
- Completion/progress hesabı; auto-save
- Analiz prompt’una `serializeBrandDnaContext` ile enjekte edilir
- Benchmark stratejik context ile `mergeBrandContexts` üzerinden birleşir

### 2.11 Brand Intelligence / Benchmark
- Sayfa: `/dashboard/benchmark` (`BenchmarkPageClient`)
- Bölümler:
  - Marka vaadi
  - Rakip kaynakları (Instagram handle / website, max 8; son paylaşımlar / homepage görselleri)
  - Marka hesabı bağla (Instagram OAuth, website tara, manuel 6–12 medya yükle)
  - Güven kanıtları (PDF/görsel + metin çıkarımı)
- Veri: `brand_intelligence` + `integrations` Firestore koleksiyonları
- API’ler:
  - `/api/dashboard/benchmark` (+ competitors, website-scan, historical-media, trust-proofs)
  - `/api/dashboard/integrations/instagram` (OAuth başlat / sync / disconnect)
  - `/api/auth/meta/callback` (Instagram Login callback)
- Manuel `@username` ile “bağlandım” **kapatıldı** (sahiplik yok; API `410`)
- Akış: **Instagram Hesabını Bağla** → Instagram Login → token + son 6–12 post
- &lt;6 post → kullanıcıya uyarı toast’ı

### 2.12 Bildirimler & engagement
- Dashboard notification bell + unread / mark-read / delete
- Tercihler: app + e-posta (`/api/dashboard/notifications/preferences`, Ayarlar)
- Analiz tamamlanma toast’ları + product tips kuyruğu
- Internal engagement mailer: inaktivite / yarım kalan analiz hatırlatmaları  
  (`/api/internal/engagement-mailer`, cron + SMTP)

### 2.13 Cookie consent & ölçümleme
- `CookieConsentBanner` + `ConsentAnalytics`
- Consent sonrası: Vercel Analytics, Yandex Metrica, Meta Pixel (`META_PIXEL_ID`)

### 2.14 Instagram Login / Meta durum (operasyon)
| Adım | Durum |
| --- | --- |
| Kod: Instagram Login (Facebook Page yok) | ✅ |
| Env: `INSTAGRAM_APP_ID` / `SECRET` / `REDIRECT_URI` | ✅ (local + Vercel) |
| Redirect URI | `https://usescore.net/api/auth/meta/callback` |
| Meta App | ✅ Published |
| Privacy URL | `https://usescore.net/privacy` |
| Domain verification meta tag | ✅ kodda; Meta’da Verify |
| Business portfolio | 🟡 In review |
| App Review `instagram_business_basic` Advanced Access | 🟡 Beklemede / Verification’a bağlı |
| Tester ile OAuth | ✅ Mümkün (`Instagram Testers`) |
| Rastgele kullanıcı IG bağlama | ❌ Advanced Access onayına kadar |

**Not:** Vercel deploy ≠ Meta Advanced Access. Site public olsa bile Meta Unpublished/Standard Access iken yalnız rol/tester hesapları OAuth tamamlar.

---

## 3) Teknik Mimari (Özet)

### Frontend / App
- Next.js 16 (App Router + Proxy convention)
- React 19 + TypeScript
- Tailwind CSS v4
- Framer Motion, Lucide, Sonner, Recharts
- next-intl (TR/EN)
- Vercel Analytics + Yandex Metrica + Meta Pixel (consent-gated)

### Data & Backend
- Firestore: waitlist, blog, invites, analyses/jobs, `brand_intelligence`, `brand_dna`, `integrations`, notifications
- Firebase Admin + Storage (benchmark medya / trust proofs / Brand DNA logo / analiz medya)
- Firebase Auth (end-user) + imzalı session cookie’ler
- Anthropic analiz + rubric skor
- Brand intelligence: `lib/brand-intelligence/*`
- Brand DNA: `lib/brand-dna/*`
- Grader: `lib/grader/*`, `lib/grader-auth.ts`
- Instagram Login OAuth: `lib/brand-intelligence/meta-oauth.ts`  
  (`instagram.com/oauth/authorize`, `graph.instagram.com`, scope: `instagram_business_basic`)
- Competitor/profile scrape yardımcıları: `lib/instagram/*` (rakip ve website tarama; marka hesabı OAuth ile)
- Notifications: `lib/notifications/*`
- Mail: waitlist + grader + engagement (`lib/mail/*`)

### Güvenlik
- Admin / early access / user / grader session imzalı cookie’ler
- Route koruması: `proxy.ts`
- Grader API: `assertGraderApiAccess` (public mode veya admin)
- Marka IG: yalnızca OAuth ile bağlanır (manuel handle claim yok)
- Secrets commit edilmez

---

## 4) Çalıştırma

```bash
npm install
npm run dev
```

**Lokal URL’ler**
- `http://localhost:3000` → Landing
- `http://localhost:3000/tr/analyzer` → Public Grader
- `http://localhost:3000/blog` → Blog
- `http://localhost:3000/dashboard` → Dashboard
- `http://localhost:3000/dashboard/brand-brain` → Brand DNA
- `http://localhost:3000/dashboard/benchmark` → Brand Intelligence
- `http://localhost:3000/dashboard/creative-memory` → Creative Memory
- `http://localhost:3000/privacy` → Privacy (EN)
- `http://localhost:3000/gizlilik-politikasi` → Gizlilik (TR)
- `http://localhost:3000/giris` → Kullanıcı girişi
- `http://localhost:3000/admin/login` → Admin

```bash
npm run lint
npm run build
```

> Instagram OAuth redirect production URL’ye ayarlı (`usescore.net`). Local’de “Bağla” sonrası dönüş prod callback’e gider.

---

## 5) Kritik Konfigürasyon Notları

### 5.1 Firebase (client)
- `NEXT_PUBLIC_FIREBASE_*`

### 5.2 Admin
- `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`

### 5.3 Erişim / davet
- `APP_ACCESS_MODE` (`waitlist` | `early_access` | `public`)
- `EARLY_ACCESS_SESSION_SECRET`, `APP_BASE_URL`, `USER_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

### 5.4 AI / worker
- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_TIMEOUT_MS`
- `ANALYSIS_WORKER_SECRET`, `CRON_SECRET`

### 5.5 Grader
- `GRADER_SESSION_SECRET` (yoksa `USER_SESSION_SECRET` fallback)
- Grader erişimi `APP_ACCESS_MODE=public` veya admin cookie ile açık

### 5.6 Instagram Login (zorunlu — marka hesabı OAuth)
- `INSTAGRAM_APP_ID` — Meta App → Instagram → API setup with Instagram login
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_REDIRECT_URI` — Meta’daki OAuth redirect ile **birebir aynı**  
  Prod: `https://usescore.net/api/auth/meta/callback`
- Opsiyonel: `INSTAGRAM_OEMBED_ACCESS_TOKEN` (tek post görsel çözümleme; OAuth için gerekmez)
- Geriye dönük: `META_APP_ID` / `META_APP_SECRET` / `META_REDIRECT_URI` hâlâ okunur (fallback)

### 5.7 Analytics / marketing
- `META_PIXEL_ID`
- `YANDEX_METRIKA_ID` (veya mevcut public env eşdeğeri)

### 5.8 Opsiyonel
- SMTP (waitlist, grader, engagement mailer)
- Google Translate
- Potential pipeline (Recraft / Bria / Fal)

> `.env.local` ve service account JSON commit edilmez.

---

## 6) Sıradaki Öncelikler (Kısa Roadmap)

### P0 — Instagram Live (bloklayıcı)
- [ ] Meta Business Verification onayını bekle / tamamla
- [ ] `instagram_business_basic` Advanced Access App Review onayını al
- [ ] Domain Verify’nin Meta’da yeşil olduğunu doğrula
- [ ] Prod’da tester dışı gerçek kullanıcı ile OAuth smoke test

### P1 — Brand Intelligence ürünleşme
- [ ] Benchmark + Brand DNA sinyallerinin analiz çıktısında daha görünür birleşimi
- [ ] Rakip fetch güvenilirliği (Instagram public scrape kırılganlığı)
- [ ] Historical media &lt;6 uyarısının UI’da kalıcı banner’ı
- [ ] Creative Memory ile benchmark / DNA sinyallerinin birleşik görünümü

### P1 — Operasyon / güvenlik
- [ ] Admin rate limit / audit log
- [ ] Token refresh (`graph.instagram.com/refresh_access_token`) job’u
- [ ] Engagement mailer prod cron doğrulama + SMTP izleme

### P2 — AI & Grader
- [ ] Rubric/prompt yönetim görünürlüğü
- [ ] Internal eval + job metrikleri
- [ ] Grader → paid / dashboard conversion funnel ölçümü

---

## 7) Kısa Değişiklik Günlüğü

| Tarih | Özet |
| --- | --- |
| 5 Tem 2026 | Proje kurulum, tasarım sistemi, dashboard iskeleti, ilk ILERLEME |
| 7–15 Tem 2026 | Landing, waitlist, admin, blog, early access, access mode |
| 18 Tem 2026 | Dashboard gerçek veri + analysis jobs + Anthropic + rubric |
| ~Tem 2026 | Creative Memory sayfası |
| 30 Tem 2026 | Benchmark / Brand Intelligence UI + API + Firestore modelleri |
| 30 Tem 2026 | Instagram Login OAuth (Facebook Page’siz); `graph.instagram.com` medya sync |
| 30 Tem 2026 | Manuel `@username` marka bağlama kaldırıldı; yalnız OAuth |
| 30 Tem 2026 | Privacy sayfaları; Meta domain verification meta tag |
| 30 Tem 2026 | Meta App Published; Business Verification + App Review süreci başlatıldı |
| ~31 Tem–1 Ağu 2026 | Brand DNA sayfası + API; analiz prompt context entegrasyonu |
| ~1–3 Ağu 2026 | Dashboard bildirimleri, tercihler, product tips, analiz toast’ları |
| ~3 Ağu 2026 | Cookie consent + Meta Pixel (consent-gated); LP live support |
| ~3–5 Ağu 2026 | Public Grader/Analyzer: misafir akış, e-posta, lead, claim, rapor UI |
| ~4–6 Ağu 2026 | Auth cookie sertleştirme; dashboard/LP/report UI olgunlaştırma |
| 6 Ağu 2026 | ILERLEME Faz 2.3’e çekildi (Grader + Brand DNA + ürün ops) |

---

## 8) Doküman Güncelleme Kuralı

Her anlamlı geliştirmeden sonra şu 4 başlık güncellenir:
1. Mevcut faz + yönetici özeti
2. Canlı kapsam / teknik mimari (değiştiyse)
3. Roadmap öncelikleri
4. Kısa değişiklik günlüğü
