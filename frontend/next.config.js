/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    optimizePackageImports: ["@heroicons/react"],
  },
  reactStrictMode: true,
  // Disable telemetry at the config level.
  // This also suppresses the "Next.js (14.x) is outdated" dev-overlay banner.
  env: {
    NEXT_TELEMETRY_DISABLED: '1',
  },

  // ─── Walrus publisher CORS proxy ──────────────────────────────────────────
  // The Walrus testnet publisher blocks direct browser POST requests with a CORS
  // 403.  Route /api/walrus/* through a Next.js server-side rewrite so the
  // request is made from the Node origin rather than the browser.
  async rewrites() {
    const publisherBase =
      process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
      'https://publisher.walrus-testnet.walrus.space';

    return [
      {
        source: '/api/walrus/blobs',
        destination: `${publisherBase}/v1/blobs`,
      },
      {
        source: '/api/walrus/blobs/:path*',
        destination: `${publisherBase}/v1/blobs/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
