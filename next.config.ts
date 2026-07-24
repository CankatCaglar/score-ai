import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native modules must stay external to the bundler.
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  // Ship Noto Sans fonts with the serverless bundle for the vector text overlay.
  outputFileTracingIncludes: {
    "/api/dashboard/potential-image": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
