import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quotzen — Timeless Quotes, Philosophy & Literary Sanctuary",
    short_name: "Quotzen",
    description:
      "Explore a curated collection of meaningful quotes from books, speeches, and thinkers across history.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5efe6",
    theme_color: "#212529",
    orientation: "portrait-primary",
    categories: ["books", "education", "literature", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Explore Quotes",
        short_name: "Quotes",
        description: "Browse curated quotes and reflections",
        url: "/quotes",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Authors & Thinkers",
        short_name: "Authors",
        description: "Find thinkers, philosophers, and writers",
        url: "/authors",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Saved Notebook",
        short_name: "Notebook",
        description: "Access your private saved quotations offline",
        url: "/saved",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Reflect by Feeling",
        short_name: "Moods",
        description: "Find quotations calibrated to your current moment",
        url: "/#mood-filter",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
