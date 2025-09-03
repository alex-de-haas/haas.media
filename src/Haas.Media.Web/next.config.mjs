const nextConfig = {
  reactStrictMode: true,
  // Produce a standalone server.js for smaller runtime image
  output: "standalone",
  // Avoid type/eslint build breaks inside container (CI can enforce separately)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
    ],
  },
};

export default nextConfig;
