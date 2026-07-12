# Score AI — İlerleme Durumu

> Bu dosya, projenin **operasyonel durumunu** kısa ve net takip etmek için tutulur.  
> Ürün vizyonu için: [README.md](./README.md)

**Son güncelleme:** 11 Temmuz 2026  
**Mevcut faz:** Faz 1 — Public Landing + Waitlist Backend + Admin Operasyon Paneli

---

## 1) Yönetici Özeti

| Alan | Durum | Not |
| --- | --- | --- |
| Landing (public) | ✅ Tamamlandı | Responsive hardening yapıldı |
| Waitlist backend | ✅ Canlı | Server Action + Firestore + opsiyonel SMTP |
| Admin panel (`/admin`) | ✅ Canlı | Giriş, listeleme, sıralama, arama, silme, export |
| Dashboard (iç ürün) | 🟡 Kısmi | Genel Bakış var, diğer sayfalar placeholder |
| Auth (ürün kullanıcıları) | ⏳ Planlı | Admin auth ayrı çalışıyor |
| AI analiz motoru | ⏳ Planlı | OpenAI entegrasyonu henüz yok |

---

## 2) Canlı Kapsam (Şu an çalışanlar)

### 2.1 Public taraf
- Landing page + tüm ana pazarlama blokları
- Waitlist formu (e-posta doğrulama + backend kayıt)
- Footer iletişim aksiyonları (`mailto`, Google Maps)
- Mobil/desktop responsive uyumluluk

### 2.2 Waitlist backend
- `actions/waitlist.ts` ile Firestore `waitlist` koleksiyonuna kayıt
- Aynı e-posta için deterministic ID (tekrar kayıtta merge davranışı)
- SMTP tanımlıysa otomatik hoş geldin e-postası

### 2.3 Admin operasyon paneli
- Güvenli giriş (`/admin/login`)
- Korumalı rota (`proxy.ts`, Next.js 16 Proxy convention)
- Waitlist kayıtlarını:
  - listeleme
  - en yeni / en eski sıralama
  - e-posta veya ID ile arama
  - tekil kayıt silme
  - CSV / Word / PDF export
- Mobil uyumlu yönetim ekranı

---

## 3) Teknik Mimari (Özet)

### Frontend / App
- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- Framer Motion, Lucide, Sonner

### Data & Backend
- Firebase Firestore (waitlist data store)
- Firebase Admin SDK (admin panelde sunucu tarafı erişim)
- Server Actions (yazma/okuma/silme akışları)
- Nodemailer (opsiyonel SMTP)

### Güvenlik
- Admin oturumu: imzalı `httpOnly` cookie
- Admin route koruması: `proxy.ts`
- Action seviyesinde ikinci doğrulama: `requireAdmin()`
- Firestore kuralı: waitlist için create açık, read/update/delete client tarafında kapalı

---

## 4) Çalıştırma

```bash
npm install
npm run dev
```

**Lokal URL'ler**
- `http://localhost:3000` → Landing
- `http://localhost:3000/dashboard` → İç uygulama (UI)
- `http://localhost:3000/admin/login` → Admin girişi

Kalite kontrol:

```bash
npm run lint
npm run build
```

---

## 5) Kritik Konfigürasyon Notu

Admin panelin waitlist verisini okuyup silebilmesi için production ortamında aşağıdaki env değişkenleri zorunludur:

- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

> Not: `.env.local` veya service account JSON dosyaları repository’ye commit edilmez.

---

## 6) Sıradaki Öncelikler (Kısa Roadmap)

### P1 — Ürünleşme
- Dashboard alt sayfalarını placeholder’dan gerçek içeriklere taşıma
- Upload modalını gerçek dosya yükleme + analiz tetikleme akışına bağlama
- Mock veriden Firestore/gerçek veri katmanına geçiş

### P1 — Güvenlik ve Operasyon
- Admin login için rate-limit / brute-force koruması
- Admin aksiyonları için audit log (kim, ne zaman, hangi kaydı sildi)
- Env/secret rotation prosedürü dokümantasyonu

### P2 — AI katmanı
- OpenAI tabanlı analiz/puanlama pipeline
- Prompt + scoring rubric versiyonlama
- Sonuçların dashboard ve öneri ekranlarına entegrasyonu

---

## 7) Kısa Değişiklik Günlüğü

| Tarih | Özet |
| --- | --- |
| 5 Tem 2026 | Proje kurulum, tasarım sistemi, dashboard iskeleti, ilk ILERLEME |
| 7 Tem 2026 | Landing ana yapı tamamlandı, screenshot altyapısı ve dashboard route’ları eklendi |
| 8 Tem 2026 | Landing görsel/UX revizyonları ve pazarlama blokları genişletildi |
| 10 Tem 2026 | Waitlist backend v1 (Firestore + SMTP opsiyon), responsive hardening |
| 11 Tem 2026 | Admin panel v1: güvenli giriş, listeleme/silme, export (CSV/Word/PDF), mobil iyileştirmeler |

---

## 8) Doküman Güncelleme Kuralı

Her anlamlı geliştirmeden sonra şu 4 başlık güncellenir:
1. Mevcut faz + yönetici özeti
2. Canlı kapsam / teknik mimari (değiştiyse)
3. Roadmap öncelikleri
4. Kısa değişiklik günlüğü

