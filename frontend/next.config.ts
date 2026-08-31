import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fastly.4sqi.net",
        pathname: "/img/general/**",
      },
    ],
  },
};

export default nextConfig;
