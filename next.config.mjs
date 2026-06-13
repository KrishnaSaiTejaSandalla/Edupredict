const nextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ['recharts'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
};

export default nextConfig;
