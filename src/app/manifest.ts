import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Uddhriti — Timeless Quotes and Ideas",
    short_name: "Uddhriti",
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
        name: "Discover Authors",
        short_name: "Authors",
        description: "Find thinkers, philosophers, and writers",
        url: "/authors",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Browse Categories",
        short_name: "Categories",
        description: "Explore quotes by theme and category",
        url: "/categories",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Saved Notebook",
        short_name: "Saved",
        description: "Read your offline saved quotes and reflections",
        url: "/saved",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Uddhriti Desktop Reading Sanctuary",
      },
      {
        src: "/screenshots/mobile.png",
        sizes: "750x1334",
        type: "image/png",
        form_factor: "narrow",
        label: "Uddhriti Mobile Timeless Quotes Experience",
      },
    ],
  };
}
