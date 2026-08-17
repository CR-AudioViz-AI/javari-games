/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // 2026-08-16: both of these were true, and the build was passing over 55 real
  // TypeScript errors and seven ESLint errors. They are the guards; leaving them
  // off means the guards do nothing. Anything that fails now is a genuine defect
  // and belongs fixed, not skipped.
  eslint:     { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  images: {
    unoptimized: true,
    domains: ['kteobfyferrukqeolofj.supabase.co'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}

module.exports = nextConfig
