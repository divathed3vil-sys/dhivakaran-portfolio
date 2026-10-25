import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  metadataBase: new URL("https://dhivakaran-portfolio.vercel.app"),
  title: "Dhivakaran M — Brands, products & the art in between.",
  description:
    "Dhivakaran M. A designer working between brand, product and art direction.",
  keywords: [
    "Dhivakaran M",
    "portfolio",
    "brand design",
    "product design",
    "art direction",
    "motion",
  ],
  authors: [{ name: "Dhivakaran M" }],
  openGraph: {
    title: "Dhivakaran M — Brands, products & the art in between.",
    description:
      "A designer working between brand, product and art direction.",
    type: "website",
    images: [
      {
        url: "/images/landing-1280.avif",
        width: 1280,
        height: 716,
        alt: "Dhivakaran M — opening portrait",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dhivakaran M — Brands, products & the art in between.",
    description:
      "A designer working between brand, product and art direction.",
    images: ["/images/landing-1280.avif"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-loading="true">
      <head>
        {/* LCP image preload — responsive via imagesrcset + imagesizes.
            Modern browsers preload AVIF (smallest); old browsers fall through
            to the <picture> element's WebP/JPEG fallback. */}
        <link
          rel="preload"
          as="image"
          fetchPriority="high"
          imageSrcSet="/images/landing-400.avif 400w, /images/landing-800.avif 800w, /images/landing-1280.avif 1280w, /images/landing-1920.avif 1920w"
          imageSizes="100vw"
        />
        {/* Google Fonts — will be replaced with self-hosted WOFF2 in Phase 2 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Note: Supabase preconnect will be added in Phase 5 when we know
            the actual project URL — for now, the wildcard *.supabase.co in
            next.config.ts handles remotePatterns for next/image. The browser
            does its own DNS+connect on first content image request. */}
      </head>
      <body className="antialiased font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ink focus:text-canvas focus:text-label"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
