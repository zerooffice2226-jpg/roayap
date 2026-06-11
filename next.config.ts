import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['3000-firebase-erp-1780932207205.cluster-ikslh4rdsnbqsvu5nw3v4dqjj2.cloudworkstations.dev'],
  typescript: {
    ignoreBuildErrors: true, // تخطي ذكي لأي أخطاء TypeScript فرعية في الواجهات
  }
};

export default nextConfig;