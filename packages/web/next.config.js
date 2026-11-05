/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://katha-cafe-api.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
