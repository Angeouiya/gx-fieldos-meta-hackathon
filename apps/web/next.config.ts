import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  reactStrictMode: true,
  transpilePackages: ["@gx/ui", "@gx/contracts", "@gx/permissions"],
};

export default nextConfig;
