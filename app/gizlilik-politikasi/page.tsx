import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | Score AI",
  description:
    "Score AI gizlilik politikası — hesap, analiz ve Instagram bağlantı verilerinin kullanımı.",
};

export default function GizlilikPolitikasiPage() {
  return (
    <main className="min-h-full bg-bg-light px-4 pt-12 pb-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-semibold text-brand-dark/50 transition hover:text-brand-dark"
        >
          ← Score AI
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-brand-dark">
          Gizlilik Politikası
        </h1>
        <p className="mt-2 text-sm text-brand-dark/50">
          Son güncelleme: 30 Temmuz 2026 ·{" "}
          <Link href="/privacy" className="underline hover:text-brand-dark">
            English
          </Link>
        </p>

        <div className="mt-8 space-y-5 text-sm leading-relaxed text-brand-dark/75">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">1. Kapsam</h2>
            <p>
              Bu politika, Score AI (<strong>usescore.net</strong>) hizmetini
              kullandığınızda topladığımız verileri ve bunları nasıl
              kullandığımızı açıklar.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">
              2. Topladığımız veriler
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Hesap bilgileri (ad, e-posta, oturum)</li>
              <li>Yüklediğiniz içerikler ve analiz sonuçları</li>
              <li>
                Marka zekâsı alanına girdiğiniz bilgiler (marka vaadi, rakip
                kaynakları, güven kanıtları)
              </li>
              <li>
                Instagram’ı bağladığınızda: Instagram kullanıcı adı, hesap
                kimliği, erişim izni (token) ve analiz için seçilen son medya
                (gönderi görselleri / kapakları ve ilgili metadata)
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">
              3. Instagram verisi nasıl kullanılır?
            </h2>
            <p>
              Instagram bağlantısı yalnızca sizin başlattığınız{" "}
              <strong>Instagram Login</strong> akışıyla kurulur. Başkasının
              kullanıcı adını yazarak hesap bağlanamaz.
            </p>
            <p>Instagram verilerini şu amaçlarla kullanırız:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Marka tutarlılığı ve içerik analizi</li>
              <li>Geçmiş içerik / creative memory sinyalleri</li>
              <li>Size gösterilen skor ve önerilerin üretilmesi</li>
            </ul>
            <p>
              Instagram verilerinizi reklam amacıyla satmayız. İzni yalnızca
              hizmeti sunmak için gerekli olduğu sürece saklarız; bağlantıyı
              kestiğinizde erişim token’ı kaldırılır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">
              4. Üçüncü taraflar
            </h2>
            <p>
              Hizmeti sunmak için altyapı sağlayıcıları (ör. barındırma, kimlik
              doğrulama, yapay zekâ işleme) kullanılabilir. Instagram verisine
              erişim Meta’nın Instagram API’si üzerinden, verdiğiniz izinler
              kapsamında sağlanır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">5. Haklarınız</h2>
            <p>
              Hesabınızı silebilir, Instagram bağlantısını koparabilir veya
              veri talepleriniz için bizimle iletişime geçebilirsiniz:{" "}
              <a
                className="font-medium text-brand-dark underline"
                href="mailto:info@usescore.net"
              >
                info@usescore.net
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">6. İletişim</h2>
            <p>
              Score AI — Nera Social / usescore.net
              <br />
              E-posta: info@usescore.net
            </p>
          </section>
        </div>
        <div className="h-[22rem] sm:h-80" aria-hidden />
      </div>
    </main>
  );
}
