import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Este proyecto vive en una subcarpeta del repo de ContaVE, que trae
    // su propio lockfile. Se fija la raíz aquí para que Turbopack no la
    // infiera incorrectamente.
    root: __dirname,
  },
};

export default nextConfig;
