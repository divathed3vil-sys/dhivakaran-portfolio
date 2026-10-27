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
    // Phase 2 cache fix — bump Vercel Image Optimizer cache TTL to 30 days.
    // Original Next.js default is 14400s (4h). Originally bumped to 86400s
    // (24h, commit 8c0a1e9) but Supabase free-plan egress limits (~5GB/mo)
    // forced a more aggressive setting. With 30-day TTL:
    //   - New uploads (cacheControl: '31536000' at origin) → Vercel caches
    //     variants for 1 year minimum per origin's max-age directive.
    //   - Existing uploads (origin still returns 'private, no-cache' due to
    //     the pre-fix cacheControl format bug) → Vercel holds variants for
    //     30 days minimum (overriding origin's no-cache directive).
    // Egress math (existing 9 MB PNG worst case × 14 variants = 126 MB per
    // cache cycle):
    //   - 4h TTL:  126 MB × 6/day  = ~756 MB/day  = ~22 GB/mo  ← blew past 5 GB
    //   - 24h TTL: 126 MB × 1/day = ~126 MB/day  = ~3.8 GB/mo  ← within limit
    //   - 30d TTL: 126 MB / 30d   = ~4.2 MB/day  = ~126 MB/mo  ← huge headroom
    // Safe because we never overwrite existing Storage objects — same source
    // URL always maps to the same image bytes, so a longer TTL cannot serve
    // stale content. New uploads get NEW UUIDs in their paths, so cache
    // invalidation is automatic when a new image is added.
    minimumCacheTTL: 2592000,
  },
};

export default nextConfig;
