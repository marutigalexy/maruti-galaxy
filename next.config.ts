import type { NextConfig } from "next";

import { nextSecurityHeaders } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  // Same-origin application. Do not add a public cross-origin API in v1.
  poweredByHeader: false,
  // Playwright uses http://127.0.0.1:3000. Next.js 16 treats that as a
  // different origin from localhost and blocks /_next chunks in development,
  // so client-side dialogs never open. This list is ignored in production.
  allowedDevOrigins: ["127.0.0.1"],
  // Server Actions compare Origin to Host by default. Do not add wildcard
  // allowedOrigins; that would bypass CSRF protection.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: nextSecurityHeaders({
          production: process.env.NODE_ENV === "production",
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        }),
      },
    ];
  },
};

export default nextConfig;
