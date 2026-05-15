const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    const backendApiUrl = process.env.BACKEND_API_URL || "http://localhost:4000/api";
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${backendApiUrl.replace(/\/$/, "")}/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
