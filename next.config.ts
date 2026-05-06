import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" produces a self-contained server.js used by the Tauri desktop build.
  // Normal `npm run dev` and `npm run start` are unaffected.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
