/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  images: {
    domains: [
      'vomage-storage.s3.amazonaws.com',
      'vomage-cdn.cloudfront.net',
      'localhost',
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
