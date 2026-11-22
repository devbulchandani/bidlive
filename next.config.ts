import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // The dev-mode badge sits over the UI and ends up in every screen recording.
  devIndicators: false,
  // Keeps the trace root inside this project (there are lockfiles higher up the tree).
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
