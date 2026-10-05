/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '*',
        port: '4000',
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    // Use Docker service name for internal communication
    const apiUrl = process.env.NESTJS_API_URL || 'http://api:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
