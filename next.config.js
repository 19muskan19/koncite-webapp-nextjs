/** @type {import('next').NextConfig} */
const nextConfig = {
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
    /** Serial static generation helps avoid flaky missing-manifest errors on Windows when collecting page data. */
    staticGenerationMaxConcurrency: 1,
    workerThreads: false,
    staticGenerationRetryCount: 2,
  },
  // Proxy API requests through Next.js to avoid CORS when frontend and backend are different origins
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://staging.koncite.com/api';
    /** `/api-proxy/<x>` → `{base}/<x>`. Koncite `server.py` uses `/api/process` (not `/process`); `base` must end with `/api`. */
    let base = apiUrl.replace(/\/+$/, '');
    if (!/\/api$/i.test(base)) base = `${base}/api`;
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
