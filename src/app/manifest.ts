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
  };
}
