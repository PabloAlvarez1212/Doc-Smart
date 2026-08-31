/** @type {import('next').NextConfig} */

const nextConfig = {
  reactCompiler: true,

  // Evita que Next/Vercel quite el "/" final
  skipTrailingSlashRedirect: true,

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
        destination:
          "https://doc-smart-production.up.railway.app/api/:path*/",
      },
    ];
  },
};

export default nextConfig;