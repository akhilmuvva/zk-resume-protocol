import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for RainbowKit
  transpilePackages: ["@rainbow-me/rainbowkit"],

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
  },

  // Webpack fallback for environments where Turbopack is disabled
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        os: false,
      };
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
        layers: true,
      };
    }
    return config;
  },
};

export default nextConfig;
