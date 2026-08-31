/** @type {import('next').NextConfig} */

const backendUrl =
  process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  reactCompiler: true,

  skipTrailingSlashRedirect: true,

  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
  ],

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/uhhdi5jp/**",
      },
    ],

    dangerouslyAllowLocalIP: true,
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*/",
        destination: `${backendUrl}/api/:path*/`,
      },
    ];
  },
};

export default nextConfig;