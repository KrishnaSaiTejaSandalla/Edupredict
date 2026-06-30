const nextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    typedRoutes: true,
    optimizePackageImports: ['recharts'],
    serverActions: {
      bodySizeLimit: '4mb',
    },
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
