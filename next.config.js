/** @type {import('next').NextConfig} */
const nextConfig = {
  // 2026-08-29: required for @craudioviz/platform-sdk. The SDK ships raw
  // TypeScript and Next does not run node_modules through SWC by default, so
  // any import carrying a `type` re-export fails the build without this.
  transpilePackages: ["@craudioviz/platform-sdk"],
  async headers() {
    // 2026-08-13: every vertical app served none of these. The core platform
    // has had them since July; the satellites were never given them. Without
    // X-Frame-Options any of these pages can be framed for clickjacking,
    // without nosniff a user-uploaded file can be coaxed into executing, and
    // without a referrer policy the full URL leaks to every third party.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  eslint:     { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    unoptimized: true,
    domains: ['kteobfyferrukqeolofj.supabase.co'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}


// 2026-08-30: Next 15 compiles instrumentation.ts for the EDGE runtime as well
// as node, so the vault env-shim's `crypto` import is pulled into an edge
// bundle even though register() returns early off nodejs. Marking it
// unavailable for the edge compilation is what stops it. The import must stay
// a BARE `crypto` specifier: webpack rejects the `node:` scheme before
// resolve.fallback is ever consulted, so `node:crypto` fails here too.
const _edgeCryptoOff = (config, { nextRuntime }) => {
  if (nextRuntime === "edge") {
    config.resolve = config.resolve || {};
    config.resolve.fallback = { ...(config.resolve.fallback || {}), crypto: false };
  }
  return config;
};

module.exports = { ...nextConfig, webpack: _edgeCryptoOff };
