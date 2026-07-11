# Score AI

Score AI, sosyal medya ve dijital pazarlama içeriklerini yapay zeka ile analiz edip puanlayan (scoring) ve iyileştirme önerileri sunan bir B2B SaaS platformudur. Amaç, içerik üretim ve optimizasyon sürecini veriye dayalı, ölçülebilir ve hızlı hale getirmektir.

## Mevcut Durum (Temmuz 2026)

- Landing page aktif ve kapsamlı responsive iyileştirmeler tamamlandı (mobil header/hamburger, kart ve spacing düzenleri).
- Waitlist akışı canlı: Server Action ile Firestore `waitlist` koleksiyonuna kayıt yapılıyor.
- SMTP değişkenleri tanımlıysa kullanıcıya hoş geldin e-postası gönderiliyor (opsiyonel).
- Dashboard şu an UI iskeleti + mock verilerle çalışıyor; alt sayfalar placeholder.

## Amaç

- Dijital içeriklerin performansını yapay zeka ile analiz etmek ve nesnel bir puan (score) üretmek.
- İçeriklerin güçlü/zayıf yönlerini ortaya koyarak somut, uygulanabilir iyileştirme önerileri sunmak.
- İçerik üretim ve karar süreçlerini hızlandırarak zaman ve maliyet tasarrufu sağlamak.

## Hedef Kitle

- **Ajanslar:** Birden fazla müşteri hesabını yöneten, ölçeklenebilir ve tekrarlanabilir içerik değerlendirme akışına ihtiyaç duyan dijital/kreatif ajanslar.
- **KOBİ'ler:** Sınırlı pazarlama kaynağıyla profesyonel kalitede içerik üretmek ve performansını artırmak isteyen küçük ve orta ölçekli işletmeler.



## Teknoloji Yığını



### Frontend

- **Next.js (App Router)** - Routing ve sayfa/layout mimarisi.
- **React** - Bileşen tabanlı arayüz geliştirme.
- **Tailwind CSS v4** - Utility-first, tutarlı ve hızlı stillendirme.
- **TypeScript** - Tip güvenliği.
- **Framer Motion** - Landing sayfası geçiş animasyonları.



### Backend & Veritabanı

- **Firebase**
  - **Firestore** - Waitlist kayıtları için aktif kullanımda.
  - **Authentication** - Planlanan (henüz aktif değil).
  - **Storage** - Planlanan (henüz aktif değil).
- **Next.js Server Actions** - Waitlist kayıt akışı.
- **Nodemailer (opsiyonel)** - SMTP varsa hoş geldin e-postası.



### AI Motoru

- **OpenAI GPT-4o** - İçerik analizi, puanlama ve öneri üretimi.



## Mimari

Score AI, fazlı ilerleyen bir B2B SaaS mimarisiyle geliştirilmektedir.

Mevcut fazda odak, landing + waitlist toplama + dashboard UI iskeletidir. Kimlik doğrulama (Login / Signup), gerçek içerik yükleme akışı ve tam analiz motoru bir sonraki fazlarda devreye alınacaktır.

İlerleyen fazlarda, kullanıcıların **sosyal medya hesaplarını OAuth ile bağlayabileceği** bir sistem kurgulanmıştır. Bu sayede içeriklerin doğrudan bağlı hesaplar üzerinden analiz edilmesi ve performans verileriyle zenginleştirilmesi hedeflenmektedir.

## Tasarım & UI Dili

Tüm sayfaların arayüz dili **temiz, sade ve premium** olacak şekilde tasarlanır (Apple / Linear tarzı):

- Minimalist düzen, bol boşluk (whitespace) ve net görsel hiyerarşi.
- Sade tipografi ve ölçülü renk paleti.
- Dikkat dağıtmayan, işlevsel ve yüksek kaliteli bir kullanıcı deneyimi.



## Not

> Bu README, proje vizyonunu ve uzun vadeli hedefleri anlatır.  
> **Güncel teknik durum, tamamlanan işler ve günlük değişiklikler** için bkz. `[ILERLEME.md](./ILERLEME.md)` — her anlamlı geliştirmeden sonra güncellenir.

