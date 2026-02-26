/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ['ui-avatars.com', 'picsum.photos'],
  },
  // Proxy API requests through Next.js to avoid CORS when frontend and backend are different origins
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging.koncite.com/api';
    const base = apiUrl.replace(/\/+$/, '');
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${base}/:path*`,
      },
    ];
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
