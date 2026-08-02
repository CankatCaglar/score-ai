import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Score AI",
  description:
    "Score AI privacy policy — how we use account, analysis, and Instagram connection data.",
};

export default function PrivacyPolicyPage() {
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
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-brand-dark/50">
          Last updated: July 30, 2026 ·{" "}
          <Link
            href="/gizlilik-politikasi"
            className="underline hover:text-brand-dark"
          >
            Türkçe
          </Link>
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-brand-dark/75">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">1. Scope</h2>
            <p>
              This policy explains what data Score AI (
              <strong>usescore.net</strong>) collects and how we use it when you
              use our service.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">
              2. Data we collect
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Account details (name, email, session)</li>
              <li>Content you upload and analysis results</li>
              <li>
                Brand intelligence inputs (brand promise, competitor sources,
                trust proofs)
              </li>
              <li>
                When you connect Instagram: Instagram username, account ID,
                access token, and recent media selected for analysis (post
                images/thumbnails and related metadata)
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">
              3. How Instagram data is used
            </h2>
            <p>
              Instagram is connected only through the user-initiated{" "}
              <strong>Instagram Login</strong> flow. Users cannot connect an
              account by typing someone else’s public username.
            </p>
            <p>We use Instagram data to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Analyze brand consistency and content quality</li>
              <li>Build historical / creative memory signals</li>
              <li>Generate scores and recommendations shown to you</li>
            </ul>
            <p>
              We do not sell Instagram data for advertising. We retain access
              only as needed to provide the service; disconnecting Instagram
              removes the stored access token.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">
              4. Third parties
            </h2>
            <p>
              We use infrastructure providers (hosting, authentication, AI
              processing) to operate the product. Instagram data is accessed via
              Meta’s Instagram APIs under the permissions you grant.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">
              5. Your rights
            </h2>
            <p>
              You may delete your account, disconnect Instagram, or contact us
              about data requests at{" "}
              <a
                className="font-medium text-brand-dark underline"
                href="mailto:info@usescore.net"
              >
                info@usescore.net
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-brand-dark">6. Contact</h2>
            <p>
              Score AI — usescore.net
              <br />
              Email: info@usescore.net
            </p>
          </section>
        </div>
        <div className="h-[22rem] sm:h-80" aria-hidden />
      </div>
    </main>
  );
}
