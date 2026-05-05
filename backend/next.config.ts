import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    // Les routes API ne doivent jamais être servies depuis le cache SW
    runtimeCaching: [
      {
        urlPattern: /\/api\/.*/i,
        handler: "NetworkOnly",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // La magie est ici : on applique ces règles à TOUTES les routes API
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ]
      }
    ]
  }
};

export default nextConfig;
