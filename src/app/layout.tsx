import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ServiceWorkerRegister, InstallPrompt } from "@/components";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: {
    default: "Quotzen — Timeless Quotes, Philosophy & Literary Sanctuary",
    template: "%s | Quotzen",
  },
  description:
    "Explore a curated, searchable collection of meaningful quotes from history's greatest philosophers, poets, and thinkers. Verified against primary texts, distraction-free, and available offline.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
    types: {
      "application/rss+xml": `${siteUrl}/feed.xml`,
    },
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quotzen",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Quotzen — Timeless Quotes, Philosophy & Literary Sanctuary",
    description:
      "A warm, searchable home for memorable quotations from books, speeches, interviews, scripture, and everything that keeps language alive.",
    url: siteUrl,
    siteName: "Quotzen",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quotzen — Timeless Quotes, Philosophy & Literary Sanctuary",
    description:
      "A curated collection of meaningful quotes from books, speeches, and thinkers.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#212529",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
