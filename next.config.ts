import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root to this project. Without this, Turbopack detects
    // a stray package-lock.json in the home directory and may infer the wrong
    // root. Docs: node_modules/next/dist/docs/.../next-config-js/turbopack.md
    root: __dirname,
  },
};

export default nextConfig;
