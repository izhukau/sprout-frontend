import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@excalidraw/excalidraw"],
};

export default nextConfig;
