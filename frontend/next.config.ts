import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For Tencent EdgeOne static deployment, uncomment the following:
  // output: "export",
  // trailingSlash: true,
  // images: { unoptimized: true },

  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["192.168.56.1", "localhost"],
};

export default nextConfig;
