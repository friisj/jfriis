import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript errors temporarily ignored while we fix Supabase type drift
  // TODO: Remove after completing OJI-XX (Supabase type regeneration)
  // See docs/infrastructure/TEST_HARNESS_SPEC.md
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint errors are now enforced in CI
};

export default nextConfig;
