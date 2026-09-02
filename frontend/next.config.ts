import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fastly.4sqi.net",
        pathname: "/img/general/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "api.mapbox.com",
        pathname: "/styles/v1/**",
      },
    ],
  },
};

export default nextConfig;
