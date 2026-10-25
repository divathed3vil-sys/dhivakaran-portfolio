import type { Metadata } from "next";
import "./globals.css";

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
        {/* LCP-critical font preload — Fraunces Roman 700 is used by the hero
            H1 ("Dhivakaran M"). Variable WOFF2 covers 300-700, so this one
            preload satisfies all roman weights. crossorigin is required for
            fonts. Italic + JetBrains Mono use font-display: swap (no preload —
            they're not on the LCP critical path). */}
        <link
          rel="preload"
          as="font"
          href="/fonts/fraunces-roman-latin.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
          fetchPriority="high"
        />
        {/* Self-hosted WOFF2 fonts — declared via @font-face in globals.css.
            No external render-blocking Google Fonts request. */}
      </head>
      <body className="antialiased font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-ink focus:text-canvas focus:text-label"
        >
          Skip to content
        </a>
        {children}
        {/* Phase 4 — Toaster removed: nothing in the codebase triggers useToast()
            or toast() calls. Drops @radix-ui/react-toast + lucide-react (X icon)
            from initial bundle. Re-add as dynamic({ ssr:false }) when toasts
            are actually needed (e.g. Phase 5b "saved!" feedback on Studio edits). */}
      </body>
    </html>
  );
}
