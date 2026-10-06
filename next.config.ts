import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  agentRules: false,
  async rewrites() {
    return { beforeFiles: [{ source: '/', destination: '/design/streaming-v1/index.html' }] };
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "kxrxdantgsnykiqqqmzj.supabase.co" },
    ],
  },
};

export default nextConfig;
