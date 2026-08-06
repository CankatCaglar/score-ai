import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Native modules must stay external to the bundler.
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  // Ship Noto Sans fonts with the serverless bundle for the vector text overlay.
  outputFileTracingIncludes: {
    "/api/dashboard/potential-image": ["./assets/fonts/**/*"],
  },
  // Profile photo uploads allow up to 5 MB; leave headroom for multipart framing.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async redirects() {
    return [
      // Legacy default-locale prefixes → unprefixed (`localePrefix: as-needed`).
      {
        source: "/tr",
        destination: "/",
        permanent: true,
      },
      {
        source: "/tr/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/grader",
        destination: "/analyzer",
        permanent: true,
      },
      {
        source: "/grader/:path*",
        destination: "/analyzer/:path*",
        permanent: true,
      },
      // Constrain locale so `/api/grader/*` is not rewritten as locale=`api`.
      {
        source: "/:locale(tr|en)/grader",
        destination: "/:locale/analyzer",
        permanent: true,
      },
      {
        source: "/:locale(tr|en)/grader/:path*",
        destination: "/:locale/analyzer/:path*",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
