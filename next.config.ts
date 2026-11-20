import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Keeps the trace root inside this project (there are lockfiles higher up the tree).
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
