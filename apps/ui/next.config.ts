import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/u/**",
      },
      {
        protocol: "https",
        hostname: "github.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      // modo demo: /demo e /demo/* servem o dashboard, mas o cliente
      // detecta a rota /demo/* para usar o mock em vez da API real.
      { source: "/demo", destination: "/dashboard" },
      { source: "/demo/:path*", destination: "/dashboard/:path*" },
    ];
  },
};

export default nextConfig;
