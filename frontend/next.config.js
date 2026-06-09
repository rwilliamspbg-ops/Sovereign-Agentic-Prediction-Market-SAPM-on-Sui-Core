/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@heroicons/react"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  // Disable telemetry at the config level.
  // This also suppresses the "Next.js (14.x) is outdated" dev-overlay banner:
  // the version staleness check is gated behind `telemetry.isEnabled`, so
  // disabling telemetry returns staleness: "unknown" and renders no badge.
  //
  // 14.2.35 is the latest stable 14.x patch. A major-version migration to
  // 15/16 (React 19 + breaking App Router changes) is a separate task.
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },
};

module.exports = nextConfig;
