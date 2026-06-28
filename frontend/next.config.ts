import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard deployment for Elastic Beanstalk
  // Port is set via environment variable in start script
  experimental: {
    // Ensure proper production build
    optimizePackageImports: ['recharts', 'leaflet']
  }
};

export default nextConfig;
