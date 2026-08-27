/** @type {import('next').NextConfig} */

const nextConfig = {
  reactCompiler: true,

  images: {
    remotePatterns: [
      // Imágenes servidas por Django en desarrollo
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },

      // Imágenes almacenadas en Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/uhhdi5jp/**",
      },
    ],

    // Solo necesario para acceder a localhost/IP local
    dangerouslyAllowLocalIP: true,
  },
};

export default nextConfig;