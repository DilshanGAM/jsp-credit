import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // stops `next dev` from writing its own agent instructions into the repo
  agentRules: false,
};

export default nextConfig;
