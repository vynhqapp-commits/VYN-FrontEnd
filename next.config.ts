import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Tree-shake lucide icons instead of pulling the whole package into the main chunk
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
