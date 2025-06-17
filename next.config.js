/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 暂时移除 standalone 输出模式
  // output: 'standalone',
  images: {
    domains: [
      'vomage-storage.s3.amazonaws.com',
      'vomage-cdn.cloudfront.net',
      'images.unsplash.com', // 添加Unsplash支持
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
