import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["react-icons", "recharts"],
  },
};

export default nextConfig;
