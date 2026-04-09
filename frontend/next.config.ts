import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // EdgeOne Pages supports full Next.js SSR natively.
  // Using standalone output for optimal build size and compatibility.
  output: "standalone",

  images: {
    unoptimized: true,
  },

  // Allow all origins in production (EdgeOne handles edge security).
  allowedDevOrigins: ["192.168.56.1", "localhost"],
};

export default nextConfig;
