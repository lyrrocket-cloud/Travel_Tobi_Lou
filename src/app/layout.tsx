import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: '旅行工具箱',
  description: '旅行工具箱 - 包含许愿、规划、记账、驾驶等功能',
  keywords: [
    '旅行工具箱',
    '旅行许愿',
    '旅行规划',
    '旅行记账',
    '旅行驾驶',
    '旅行',
  ],
  authors: [{ name: 'Coze Code Team', url: 'https://code.coze.cn' }],
  generator: 'Coze Code',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
