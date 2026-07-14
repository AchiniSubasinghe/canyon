import type { NextConfig } from "next";

/**
 * In production (split hosting), proxy /api/v1/* through the frontend origin so
 * the httpOnly refresh cookie is first-party on the Vercel domain.
 *
 * Set API_BACKEND_URL to the Render base URL (no path), e.g.:
 *   API_BACKEND_URL=https://canyon-xtpk.onrender.com
 * And point the browser at the same origin:
 *   NEXT_PUBLIC_API_URL=/api/v1
 */
const backendUrl = process.env.API_BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    if (!backendUrl) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
