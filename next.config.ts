import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // 产出可独立运行的服务端包（部署用）
  output: 'standalone',
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  /* config options here */
  allowedDevOrigins: ['*.dev.coze.site'],
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lf-coze-web-cdn.coze.cn',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
