import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ESLint errors are now enforced in CI
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
