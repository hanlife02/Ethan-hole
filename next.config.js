/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
  // 在构建时验证环境变量
  env: {
    CUSTOM_KEY: process.env.ACCESS_KEY,
  },
}

module.exports = nextConfig
