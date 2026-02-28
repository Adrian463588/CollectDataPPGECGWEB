import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // Static export for Tencent EdgeOne deployment
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
