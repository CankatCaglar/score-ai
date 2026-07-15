# Score AI

Score AI, sosyal medya ve dijital pazarlama içeriklerini yapay zeka ile analiz edip puanlayan (scoring) ve iyileştirme önerileri sunan bir B2B SaaS platformudur. Amaç, içerik üretim ve optimizasyon sürecini veriye dayalı, ölçülebilir ve hızlı hale getirmektir.

## Mevcut Durum (Temmuz 2026)

Aktif olarak çalışan ana parçalar:

- Public landing (`/`) ve çift dil arayüz (TR/EN)
- Waitlist kayıt akışı (Firestore + opsiyonel SMTP)
- Admin panel (`/admin`) içinde:
  - waitlist operasyonu (arama, filtre, silme, export)
  - blog yönetimi (oluşturma, düzenleme, yayınlama)
- Public blog (`/blog`, `/blog/[slug]`)
- Erken erişim davet linki akışı (`/invite/[token]`)
- Dashboard route koruması (`APP_ACCESS_MODE`: `waitlist` / `early_access`)

Not: Dashboard tarafı güçlü bir UI seviyesine ulaşmış durumda olsa da gerçek veri/AI scoring katmanı henüz tam entegre değildir.

## Ürün Vizyonu

- Dijital içeriklerin performansını AI ile analiz etmek ve nesnel bir skor üretmek
- İçeriğin güçlü/zayıf yönlerini ortaya koyup uygulanabilir öneriler sunmak
- İçerik üretim döngüsünü hızlandırıp maliyet ve zaman avantajı sağlamak

## Hedef Kitle

- **Ajanslar:** Çoklu müşteri hesabı yöneten, ölçeklenebilir değerlendirme akışına ihtiyaç duyan ekipler
- **KOBİ'ler:** Sınırlı kaynağa rağmen daha profesyonel içerik üretmek isteyen işletmeler
- **İçerik/Pazarlama ekipleri:** Veri odaklı kreatif karar alma ihtiyacı olan ekipler

## Teknoloji Yığını

### Frontend

- **Next.js 16 (App Router)**
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion**
- **Recharts**
- **Lucide React** + **Sonner**

### Backend ve Veri Katmanı

- **Firebase Firestore** (`waitlist`, `blog_posts`, `early_access_invites`)
- **Firebase Admin SDK** (sunucu tarafı admin operasyonları)
- **Next.js Server Actions** (waitlist/admin/blog akışları)
- **Nodemailer** (opsiyonel e-posta gönderimi)

### Operasyon ve Ölçümleme

- **Vercel Analytics**
- **Yandex Metrica**
- **jsPDF + jspdf-autotable** (admin export)

## Erişim Modları

`proxy.ts` ile dashboard erişimi ortam değişkenine göre yönetilir:

- `APP_ACCESS_MODE=waitlist`  
  Dashboard public kullanıcıya kapalıdır, landing'e yönlendirme yapılır.
- `APP_ACCESS_MODE=early_access`  
  Sadece geçerli davet token'ı ile oluşturulmuş early-access cookie'si olan kullanıcılar dashboard'a girer.
- Admin oturumu olan kullanıcı dashboard'a erişimde bu kısıtlamadan muaf tutulur.

## Kurulum

```bash
npm install
npm run dev
```

Lokal adresler:

- `http://localhost:3000` -> Landing
- `http://localhost:3000/blog` -> Blog
- `http://localhost:3000/dashboard` -> Ürün arayüzü (mode'a bağlı)
- `http://localhost:3000/admin/login` -> Admin login

Kalite kontrol:

```bash
npm run lint
npm run build
```

## Ortam Değişkenleri

### Zorunlu (Firebase client)

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Zorunlu (Admin)

- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

### Erişim modu / erken erişim

- `APP_ACCESS_MODE` (`waitlist` veya `early_access`)
- `EARLY_ACCESS_SESSION_SECRET` (opsiyonel; yoksa `ADMIN_SESSION_SECRET` fallback)
- `APP_BASE_URL` (invite link üretimi için)
- `EARLY_ACCESS_INVITE_EXPIRY_DAYS` (opsiyonel)

### Opsiyonel

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Çeviri: `GOOGLE_TRANSLATE_API_KEY`

## Yardımcı Scriptler

- `npm run invite:generate`  
  Waitlist kayıtlarından tek kullanımlık erken erişim linkleri üretir ve `exports/` altına CSV çıkarır.

## Not

Bu README vizyonu ve mevcut ürün iskeletini özetler.  
Günlük operasyonel takip, tamamlanan işler ve roadmap için: [ILERLEME.md](./ILERLEME.md)

