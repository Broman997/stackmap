import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.ELECTRON_BUILD === "true" ? "standalone" : undefined,
};

export default nextConfig;
