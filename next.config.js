/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: {
    domains: ['ui-avatars.com', 'picsum.photos', 'staging.koncite.com'],
  },
  // Mitigate ChunkLoadError (loading chunk app/layout timeout) - use Turbopack in dev
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Proxy API requests through Next.js to avoid CORS when frontend and backend are different origins
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging.koncite.com/api';
    const base = apiUrl.replace(/\/+$/, '');
    const origin = base.replace(/\/api\/?$/, ''); // e.g. https://staging.koncite.com
    return [
      {
        source: '/api-proxy/:path*',
        destination: `${base}/:path*`,
      },
      // Proxy company logos through same origin to avoid CORS/referrer issues
      {
        source: '/logo/:path*',
        destination: `${origin}/logo/:path*`,
      },
      // Proxy storage (profile images, etc.) through same origin to avoid CORS/referrer issues
      {
        source: '/storage/:path*',
        destination: `${origin}/storage/:path*`,
      },
    ];
  },
  // Disable webpack cache to avoid Windows file locking issues on Windows
  webpack: (config) => {
    config.cache = false;
    return config;
  },
}

module.exports = nextConfig
