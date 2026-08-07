import type { LegalSection } from "./types";

const mail = (email: string) =>
  `<a class="font-medium text-brand-dark underline" href="mailto:${email}">${email}</a>`;

export const SHIPPING_SECTIONS_TR: LegalSection[] = [
  {
    heading: "Kapsam",
    paragraphs: [
      `Bu Teslimat ve İade Politikası, Nera Reklam Pazarlama Yazılım Teknoloji Limited Şirketi tarafından sunulan Score AI dijital hizmetleri için geçerlidir. Score AI fiziksel ürün satmaz; hizmetler çevrimiçi olarak sunulur.`,
    ],
  },
  {
    heading: "Teslimat",
    paragraphs: [
      `Satın aldığınız abonelik veya dijital hizmet, ödemenin başarılı şekilde tamamlanmasının ardından hesabınıza elektronik olarak tanımlanır. Erişim, kayıtlı e-posta adresiniz ve kullanıcı hesabınız üzerinden sağlanır.`,
      `Dijital hizmetlerde kargo veya fiziksel teslimat bulunmaz. Hizmete erişimde gecikme yaşarsanız ${mail("info@usescore.net")} adresinden bizimle iletişime geçebilirsiniz.`,
    ],
  },
  {
    heading: "Ödeme",
    paragraphs: [
      `Ödemeler iyzico altyapısı üzerinden Visa, Mastercard, American Express ve Troy kartları ile güvenli şekilde alınabilir. Kart bilgileriniz Score AI sunucularında saklanmaz; ödeme sağlayıcısının güvenli altyapısı kullanılır.`,
    ],
  },
  {
    heading: "İade ve İptal",
    paragraphs: [
      `Dijital hizmetin niteliği gereği, hesabınıza tanımlanan ve kullanılmaya başlanan aboneliklerde cayma / iade talepleri ilgili mevzuat ve kullanım koşulları çerçevesinde değerlendirilir.`,
      `Yanlışlıkla yapılan ödemeler, teknik arıza kaynaklı çift tahsilatlar veya hizmetin hiç sunulamaması durumlarında iade talebinizi ${mail("info@usescore.net")} adresine iletebilirsiniz. Uygun görülen iadeler, ödeme yönteminize göre iyzico üzerinden işleme alınır.`,
      `Aboneliğinizi bir sonraki dönem başlamadan iptal edebilirsiniz; iptal sonrası dönem için ücret alınmaz. Dönem içinde kullanılan hizmete ilişkin ücretlerin iadesi, kullanım koşullarına tabidir.`,
    ],
  },
  {
    heading: "İletişim",
    paragraphs: [
      `Teslimat ve iade konularında: ${mail("info@usescore.net")}`,
    ],
  },
];

export const SHIPPING_SECTIONS_EN: LegalSection[] = [
  {
    heading: "Scope",
    paragraphs: [
      `This Delivery and Returns Policy applies to the Score AI digital services offered by Nera Reklam Pazarlama Yazılım Teknoloji Limited Şirketi. Score AI does not sell physical goods; services are delivered online.`,
    ],
  },
  {
    heading: "Delivery",
    paragraphs: [
      `After successful payment, your subscription or digital service is provisioned electronically to your account. Access is provided through your registered email address and user account.`,
      `There is no shipping or physical delivery for digital services. If you experience a delay accessing the service, contact us at ${mail("info@usescore.net")}.`,
    ],
  },
  {
    heading: "Payment",
    paragraphs: [
      `Payments are processed securely via iyzico and may be made with Visa, Mastercard, American Express, and Troy cards. Your card details are not stored on Score AI servers; they are handled by the payment provider's secure infrastructure.`,
    ],
  },
  {
    heading: "Returns and Cancellation",
    paragraphs: [
      `Due to the nature of digital services, withdrawal / refund requests for subscriptions that have been provisioned and started are evaluated under applicable law and the terms of use.`,
      `For mistaken charges, duplicate charges caused by a technical issue, or cases where the service could not be provided at all, send your refund request to ${mail("info@usescore.net")}. Approved refunds are processed via iyzico to your original payment method.`,
      `You may cancel your subscription before the next billing period begins; you will not be charged for subsequent periods. Refunds for the current period are subject to the terms of use.`,
    ],
  },
  {
    heading: "Contact",
    paragraphs: [
      `For delivery and returns: ${mail("info@usescore.net")}`,
    ],
  },
];

export function getShippingSections(locale: string) {
  return locale === "en" ? SHIPPING_SECTIONS_EN : SHIPPING_SECTIONS_TR;
}
