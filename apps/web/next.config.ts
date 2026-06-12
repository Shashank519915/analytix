import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@analytix/core",
    "@analytix/db",
    "@analytix/react",
    "@analytix/dashboard",
  ],
};

export default nextConfig;
