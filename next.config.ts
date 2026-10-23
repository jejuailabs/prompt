import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [{ source: '/games/endless-ward/:file*.wasm', headers: [{ key: 'Content-Type', value: 'application/wasm' }] }];
  },
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
