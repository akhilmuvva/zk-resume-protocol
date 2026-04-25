import type { NextConfig } from "next";

const securityHeaders = [
  // Clickjacking protection
  { key: "X-Frame-Options",        value: "DENY" },
  // MIME type sniffing protection
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer leakage protection
  { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
  // Disable unnecessary browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://cloudflare-ipfs.com https://*.pinata.cloud",
      "worker-src 'self' blob:",
      "wasm-src 'self' blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  // HSTS for 2 years
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Required for RainbowKit
  transpilePackages: ["@rainbow-me/rainbowkit"],

  // Security Headers on all routes
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

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
