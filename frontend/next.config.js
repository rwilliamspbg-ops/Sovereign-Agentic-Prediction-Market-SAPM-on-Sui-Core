/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["@heroicons/react"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
