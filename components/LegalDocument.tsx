import { ScrollToTopOnMount } from "@/components/ScrollToTopOnMount";
import { legalPageHref, type LegalPageId } from "@/lib/legal/paths";
import type { AppLocale } from "@/i18n/routing";
import type { LegalSection } from "@/lib/legal/types";

type LegalDocumentProps = {
  homeLabel: string;
  title: string;
  lastUpdated: string;
  switchLanguageLabel: string;
  locale: AppLocale;
  otherLocale: AppLocale;
  pathname: "/privacy" | "/terms" | "/shipping";
  sections: LegalSection[];
};

function pageIdFromPathname(
  pathname: LegalDocumentProps["pathname"],
): LegalPageId {
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/shipping") return "shipping";
  return "terms";
}

export function LegalDocument({
  homeLabel,
  title,
  lastUpdated,
  switchLanguageLabel,
  locale,
  otherLocale,
  pathname,
  sections,
}: LegalDocumentProps) {
  const homeHref = locale === "en" ? "/en" : "/";
  const switchHref = legalPageHref(pageIdFromPathname(pathname), otherLocale);

  return (
    <main className="min-h-full bg-bg-light px-4 pt-12 pb-16 sm:px-6 lg:px-8">
      <ScrollToTopOnMount />
      <div className="mx-auto max-w-2xl">
        {/* Plain anchors = full page load → always open at top */}
        <a
          href={homeHref}
          className="text-sm font-semibold text-brand-dark/50 transition hover:text-brand-dark"
        >
          {homeLabel}
        </a>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-brand-dark">
          {title}
        </h1>
        <p className="mt-2 text-sm text-brand-dark/50">
          {lastUpdated} ·{" "}
          <a href={switchHref} className="underline hover:text-brand-dark">
            {switchLanguageLabel}
          </a>
        </p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-brand-dark/75">
          {sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-base font-semibold text-brand-dark">
                {section.heading}
              </h2>
              {section.paragraphs?.map((html) => (
                <p
                  key={html.slice(0, 80)}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ))}
              {section.items ? (
                <ul className="list-disc space-y-1 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.paragraphsAfter?.map((html) => (
                <p
                  key={html.slice(0, 80)}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
