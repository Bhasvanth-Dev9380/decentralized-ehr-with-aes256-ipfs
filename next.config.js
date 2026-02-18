/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "bigchaindb-driver"],
  },
};

module.exports = nextConfig;
