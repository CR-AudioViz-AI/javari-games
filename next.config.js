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
            // 2026-09-02: added after an ecosystem sweep found 58 of 60 live sites
            // with no CSP and weak HSTS. The other four headers here have been right
            // since August; these two were never added.
            //
            // HSTS is enforced immediately - it only instructs the browser to refuse
            // plaintext, so there is nothing for it to break.
            //
            // CSP ships REPORT-ONLY first, deliberately. A policy that blocks a script
            // the app actually needs takes the app down, and 48 apps received this in
            // one pass. Report-Only produces the same violation reports with none of
            // the blocking, so the policy is corrected from evidence rather than from
            // a guess about what each app loads. It graduates to enforcing once the
            // reports are quiet.
            //
            // Backticks, not quotes: the policy contains 'self' and a single-quoted
            // JS string cannot hold it. The first version of this patch produced
            // 48 syntactically invalid configs, caught by parsing one before pushing.
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
            { key: 'Content-Security-Policy-Report-Only', value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.paypal.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.paypal.com; frame-src 'self' https://js.stripe.com https://*.paypal.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests` },
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

// 2026-09-05 Next 16: webpack config removed.
//
// Turbopack is the default builder in Next 16 and refuses to start when a
// webpack config exists with no turbopack equivalent.
//
// This block existed only to disable the crypto fallback on the edge runtime.
// It is scaffolding for a problem Turbopack does not have: node:crypto resolves
// correctly on edge. Proven on javari-logo and javari-forge, both of which built
// and deployed on 16.3.4 with it deleted.
//
// Thirty-seven repos carried a byte-identical copy - one sha256 across all of
// them - so this is one fix applied thirty-seven times, not thirty-seven fixes.
module.exports = { ...nextConfig };
