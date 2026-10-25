import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
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
    ],
    // Aggressive default deviceSizes — we use <picture> + srcset directly for
    // the hero (finer control), but next/image still needs sane defaults for
    // Supabase content images in Selected Work cells.
    deviceSizes: [400, 800, 1280, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
