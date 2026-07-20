import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native module; keep it external so the per-guest flyer route
  // loads the platform binary at runtime instead of being bundled.
  serverExternalPackages: ["sharp"],
};

export default nextConfig;
