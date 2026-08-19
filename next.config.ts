import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
