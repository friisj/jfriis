import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // ElevenLabs SDK imports node:child_process, node:events, node:stream
      // which are unavailable in browser bundles. Provide empty module stubs.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:(child_process|events|stream)$/,
          path.resolve(__dirname, 'lib/empty-module.js')
        )
      );
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gmjkufgctbhrlefzzicg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Disable Next.js image optimization since we're handling it with our thumbnail system
    unoptimized: true,
  },
};

export default nextConfig;
