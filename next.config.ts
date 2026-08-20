import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // sharp is a native module; keep it external so the per-guest flyer route
  // loads the platform binary at runtime instead of being bundled.
  serverExternalPackages: ["sharp"],

  // ...but "external" means Next must trace the files into the deployment, and
  // tracing follows `require`, not `dlopen`. sharp's linux binary opens
  // libvips-cpp.so from a *separate* @img/sharp-libvips-* package at runtime, so
  // the tracer never saw it and the flyer route died on load in production with
  // ERR_DLOPEN_FAILED. Force the whole @img tree into the flyer's bundle.
  outputFileTracingIncludes: {
    "/invite/[token]/flyer": ["./node_modules/@img/**/*"],
  },
};

export default nextConfig;
