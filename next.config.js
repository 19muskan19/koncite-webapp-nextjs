/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  distDir: '.next-build',
  images: {
    domains: ['ui-avatars.com', 'picsum.photos'],
  },
  // Disable webpack cache to avoid Windows file locking issues
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
}

module.exports = nextConfig
