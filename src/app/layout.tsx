import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Dhivakaran M — Brands, products & the art in between.",
    description:
      "A designer working between brand, product and art direction.",
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
