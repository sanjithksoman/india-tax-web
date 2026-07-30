/** @type {import('next').NextConfig} */
const nextConfig = {
  // In Next.js 15+, serverComponentsExternalPackages moved to serverExternalPackages
  serverExternalPackages: ["@prisma/client", "prisma"],
};

module.exports = nextConfig;
