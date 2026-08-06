import { getPathname } from "@/i18n/navigation";
import { getAppBaseUrl, wrapEmailHtml } from "@/lib/mail/smtp";
import type { AppLocale } from "@/i18n/routing";

export function analysisCompletedEmail(input: {
  title: string;
  score: number;
  slug: string;
}) {
  const baseUrl = getAppBaseUrl();
  const resultUrl = `${baseUrl}/dashboard/analiz-sonucu?slug=${encodeURIComponent(input.slug)}`;
  const subject = `Analiziniz hazır: ${input.title} (${Math.round(input.score)}/100)`;
  const text = [
    "Merhaba,",
    "",
    `"${input.title}" analiziniz tamamlandı.`,
    `Skorunuz: ${Math.round(input.score)}/100`,
    "",
    `Sonuçları görüntülemek için: ${resultUrl}`,
    "",
    "Score AI",
  ].join("\n");

  const html = wrapEmailHtml(`
    <p style="font-size: 16px; margin: 0 0 16px;">Merhaba,</p>
    <p style="font-size: 16px; margin: 0 0 16px;">
      <strong>${escapeHtml(input.title)}</strong> analiziniz tamamlandı.
    </p>
    <p style="font-size: 16px; margin: 0 0 20px;">
      Skorunuz: <strong>${Math.round(input.score)}/100</strong>
    </p>
    <p style="margin: 0 0 8px;">
      <a href="${resultUrl}" style="display:inline-block;background:#42B24D;color:#0f1a12;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
        Sonucu Görüntüle
      </a>
    </p>
  `);

  return { subject, text, html };
}

/** Guest Content Analyzer sonucu — dashboard yerine /analyzer/[slug] linki. */
export function graderAnalysisCompletedEmail(input: {
  title: string;
  score: number;
  slug: string;
  locale?: "tr" | "en";
}) {
  const baseUrl = getAppBaseUrl();
  const locale: AppLocale = input.locale === "en" ? "en" : "tr";
  const resultPath = getPathname({
    locale,
    href: {
      pathname: "/analyzer/[slug]",
      params: { slug: input.slug },
    },
  });
  const resultUrl = `${baseUrl}${resultPath}`;
  const isEn = locale === "en";
  const score = Math.round(input.score);
  const subject = isEn
    ? `Your analysis is ready: ${input.title} (${score}/100)`
    : `Analiziniz hazır: ${input.title} (${score}/100)`;
  const text = isEn
    ? [
        "Hi,",
        "",
        `Your analysis for "${input.title}" is complete.`,
        `Your score: ${score}/100`,
        "",
        `View your report: ${resultUrl}`,
        "",
        "Score AI",
      ].join("\n")
    : [
        "Merhaba,",
        "",
        `"${input.title}" analiziniz tamamlandı.`,
        `Skorunuz: ${score}/100`,
        "",
        `Raporunu görüntüle: ${resultUrl}`,
        "",
        "Score AI",
      ].join("\n");

  const html = wrapEmailHtml(
    isEn
      ? `
    <p style="font-size: 16px; margin: 0 0 16px;">Hi,</p>
    <p style="font-size: 16px; margin: 0 0 16px;">
      Your analysis for <strong>${escapeHtml(input.title)}</strong> is complete.
    </p>
    <p style="font-size: 16px; margin: 0 0 20px;">
      Your score: <strong>${score}/100</strong>
    </p>
    <p style="margin: 0 0 8px;">
      <a href="${resultUrl}" style="display:inline-block;background:#42B24D;color:#0f1a12;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
        View Report
      </a>
    </p>
  `
      : `
    <p style="font-size: 16px; margin: 0 0 16px;">Merhaba,</p>
    <p style="font-size: 16px; margin: 0 0 16px;">
      <strong>${escapeHtml(input.title)}</strong> analiziniz tamamlandı.
    </p>
    <p style="font-size: 16px; margin: 0 0 20px;">
      Skorunuz: <strong>${score}/100</strong>
    </p>
    <p style="margin: 0 0 8px;">
      <a href="${resultUrl}" style="display:inline-block;background:#42B24D;color:#0f1a12;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
        Raporu Görüntüle
      </a>
    </p>
  `,
  );

  return { subject, text, html };
}

export function inactiveUserEmail() {
  const baseUrl = getAppBaseUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;
  const subject = "Score AI sizi bekliyor — kaldığınız yerden devam edin";
  const text = [
    "Merhaba,",
    "",
    "Son birkaç gündür Score AI'ya uğramadığınızı fark ettik.",
    "Yeni bir analiz başlatarak içeriklerinizi güçlendirebilirsiniz.",
    "",
    `Panele dön: ${dashboardUrl}`,
    "",
    "Score AI",
  ].join("\n");

  const html = wrapEmailHtml(`
    <p style="font-size: 16px; margin: 0 0 16px;">Merhaba,</p>
    <p style="font-size: 16px; margin: 0 0 16px;">
      Son birkaç gündür Score AI'ya uğramadığınızı fark ettik.
      Yeni bir analiz başlatarak içeriklerinizi güçlendirebilirsiniz.
    </p>
    <p style="margin: 0 0 8px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:#42B24D;color:#0f1a12;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
        Panele Dön
      </a>
    </p>
  `);

  return { subject, text, html };
}

export function incompleteAnalysisEmail(input: { title: string; slug?: string | null }) {
  const baseUrl = getAppBaseUrl();
  const targetUrl = input.slug
    ? `${baseUrl}/dashboard/analiz-sonucu?slug=${encodeURIComponent(input.slug)}`
    : `${baseUrl}/dashboard/yeni-analiz`;
  const subject = "Yarım kalan analizinizi tamamlayın";
  const text = [
    "Merhaba,",
    "",
    `"${input.title}" analiziniz henüz tamamlanmadı.`,
    "Kaldığınız yerden devam ederek sonuçlarınızı görebilirsiniz.",
    "",
    `Devam et: ${targetUrl}`,
    "",
    "Score AI",
  ].join("\n");

  const html = wrapEmailHtml(`
    <p style="font-size: 16px; margin: 0 0 16px;">Merhaba,</p>
    <p style="font-size: 16px; margin: 0 0 16px;">
      <strong>${escapeHtml(input.title)}</strong> analiziniz henüz tamamlanmadı.
      Kaldığınız yerden devam ederek sonuçlarınızı görebilirsiniz.
    </p>
    <p style="margin: 0 0 8px;">
      <a href="${targetUrl}" style="display:inline-block;background:#42B24D;color:#0f1a12;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">
        Analize Dön
      </a>
    </p>
  `);

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
