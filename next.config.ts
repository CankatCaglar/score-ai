import type { NextConfig } from "next";

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
    ];
  },
};

export default nextConfig;
