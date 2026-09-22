import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Dev server only (ignored in production builds): let a phone on the same
  // Wi-Fi open the site at this computer's network address. Without it Next
  // blocks its scripts there, so the page renders but nothing on it works
  // (gallery thumbnails, swipe, floating reel, bag).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
