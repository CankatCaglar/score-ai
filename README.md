# Score AI

Score AI, sosyal medya ve dijital pazarlama içeriklerini yapay zeka ile analiz edip puanlayan (scoring) ve iyileştirme önerileri sunan bir B2B SaaS platformudur. Amaç, içerik üretim ve optimizasyon sürecini veriye dayalı, ölçülebilir ve hızlı hale getirmektir.

## Amaç

- Dijital içeriklerin performansını yapay zeka ile analiz etmek ve nesnel bir puan (score) üretmek.
- İçeriklerin güçlü/zayıf yönlerini ortaya koyarak somut, uygulanabilir iyileştirme önerileri sunmak.
- İçerik üretim ve karar süreçlerini hızlandırarak zaman ve maliyet tasarrufu sağlamak.

## Hedef Kitle

- **Ajanslar:** Birden fazla müşteri hesabını yöneten, ölçeklenebilir ve tekrarlanabilir içerik değerlendirme akışına ihtiyaç duyan dijital/kreatif ajanslar.
- **KOBİ'ler:** Sınırlı pazarlama kaynağıyla profesyonel kalitede içerik üretmek ve performansını artırmak isteyen küçük ve orta ölçekli işletmeler.



## Teknoloji Yığını



### Frontend

- **Next.js (App Router)** - Modern routing ve sunucu bileşenleri mimarisi.
- **React** - Bileşen tabanlı arayüz geliştirme.
- **Tailwind CSS** - Utility-first, tutarlı ve hızlı stillendirme.



### Backend & Veritabanı

- **Firebase**
  - **Authentication** - Üyelik, giriş/kayıt ve oturum yönetimi.
  - **Firestore** - Gerçek zamanlı, ölçeklenebilir NoSQL veritabanı.
  - **Storage** - Medya ve dosya depolama.



### AI Motoru

- **OpenAI GPT-4o** - İçerik analizi, puanlama ve öneri üretimi.



## Mimari

Score AI, **üyelik gerektiren (Login / Signup) bir B2B SaaS** modeli üzerine kuruludur. Platformun tüm çekirdek özellikleri kimlik doğrulaması yapılmış kullanıcılar için erişilebilirdir.

İlerleyen fazlarda, kullanıcıların **sosyal medya hesaplarını OAuth ile bağlayabileceği** bir sistem kurgulanmıştır. Bu sayede içeriklerin doğrudan bağlı hesaplar üzerinden analiz edilmesi ve performans verileriyle zenginleştirilmesi hedeflenmektedir.

## Tasarım & UI Dili

Tüm sayfaların arayüz dili **temiz, sade ve premium** olacak şekilde tasarlanır (Apple / Linear tarzı):

- Minimalist düzen, bol boşluk (whitespace) ve net görsel hiyerarşi.
- Sade tipografi ve ölçülü renk paleti.
- Dikkat dağıtmayan, işlevsel ve yüksek kaliteli bir kullanıcı deneyimi.



## Not

> Bu README, proje vizyonunu ve uzun vadeli hedefleri anlatır.  
> **Güncel teknik durum ve yapılan işler** için bkz. `[ILERLEME.md](./ILERLEME.md)` — her anlamlı geliştirmeden sonra güncellenir.

