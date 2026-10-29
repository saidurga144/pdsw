import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: "/signup",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/signup/:path*",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/register",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/register/:path*",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/create-account",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/create-account/:path*",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
