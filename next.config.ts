import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No ESLint config in the scaffold yet; don't let that fail a Vercel build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
