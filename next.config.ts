import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ['127.0.0.1','127.0.0.2','localhost'],
  logging: { incomingRequests: { ignore: [/^\/landing-preview\//] } },
  agentRules: false,
  outputFileTracingExcludes: { '*': ['./local-h3-benchmark/**/*', './tmp/**/*'] },
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
