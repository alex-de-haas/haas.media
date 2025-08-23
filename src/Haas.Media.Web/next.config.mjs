const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Produce a standalone server.js for smaller runtime image
  output: "standalone",
  experimental: {
    forceSwcTransforms: true,
  },
  // Avoid type/eslint build breaks inside container (CI can enforce separately)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
