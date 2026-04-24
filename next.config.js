/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  /** Avoid webpack bundling issues with the OpenAI SDK in server/API route chunks. */
  serverExternalPackages: ['openai'],
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
    const origin = base.replace(/\/api\/?$/, ''); // e.g.   https://koncite.com
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
      // Company web UI ajax (session/CSRF + Bearer) — e.g. PR status on material_requests
      {
        source: '/company-proxy/:path*',
        destination: `${origin}/company/:path*`,
      },
    ];
  },
  // Avoid persistent webpack disk cache on Windows (can hit EPERM / locking) but keep a fast dev cache.
  // config.cache = false caused very slow rebuilds → ChunkLoadError timeouts loading app/layout.js
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: 'memory' };
      // Slow Windows disk/AV can hit default chunk load timeout.
      if (config.output) {
        config.output.chunkLoadTimeout = 300000;
      }
    }
    return config;
  },
}

module.exports = nextConfig
