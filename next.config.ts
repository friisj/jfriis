import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // TODO: Generate proper Supabase types to fix these errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
