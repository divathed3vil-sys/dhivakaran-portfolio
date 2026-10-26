import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the chat preview panel origin to access the dev server so HMR +
  // dev-only features work. Without this, Next.js logs a cross-origin warning
  // and HMR silently breaks — the user can't see code changes live.
  // Pattern covers: preview-chat-{session-id}.space-z.ai + any *.space-z.ai subdomain.
  allowedDevOrigins: ['*.space-z.ai', '*.vercel.app'],
  images: {
    // Modern formats first — AVIF where supported, WebP fallback
    formats: ['image/avif', 'image/webp'],
    // Allow Supabase Storage content images to be served through next/image
    // for format negotiation + responsive variants.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/**',
      },
      // Phase 5b.8 — YouTube thumbnails for next/image optimizer
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
    // Aggressive default deviceSizes — we use <picture> + srcset directly for
    // the hero (finer control), but next/image still needs sane defaults for
    // Supabase content images in Selected Work cells.
    deviceSizes: [400, 800, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
