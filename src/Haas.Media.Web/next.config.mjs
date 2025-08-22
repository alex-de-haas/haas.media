const downloaderApi =
  process.env["API_DOWNLOADER_URL"] ?? "http://downloader-api:8080";

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
  async rewrites() {
    return [
      {
        source: "/api/downloader/:path*",
        destination: `${downloaderApi}/:path*`,
      },
    ];
  },
};

export default nextConfig;
