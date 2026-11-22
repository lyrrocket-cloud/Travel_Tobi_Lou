import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { ScrollReveal } from '@/components/motion/ScrollReveal';
import { ScrollProgress } from '@/components/motion/ScrollProgress';
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
  authors: [{ name: 'Tobi Lou', url: 'https://travel.tobilou.top' }],
  openGraph: {
    title: '旅行工具箱',
    description: '旅行工具箱 - 包含许愿、规划、记账、驾驶等功能',
    siteName: '旅行工具箱',
    locale: 'zh_CN',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {/* 仅当 JS 可用时才隐藏 .reveal 内容；若 3s 内 ScrollReveal 未接管，自动恢复可见 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js');setTimeout(function(){if(!document.documentElement.classList.contains('reveal-ready')){document.documentElement.classList.remove('js')}},3000)`,
          }}
        />
        <SmoothScroll />
        <ScrollReveal />
        <ScrollProgress />
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
