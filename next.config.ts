import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useLightningcss: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "commons.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;
