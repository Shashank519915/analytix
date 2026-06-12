import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@Shashank519915/analytix-core",
    "@analytix/db",
    "@Shashank519915/analytix-react",
    "@Shashank519915/analytix-dashboard",
  ],
};

export default nextConfig;
