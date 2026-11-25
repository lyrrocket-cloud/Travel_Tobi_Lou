import Image from 'next/image';

/**
 * 全局背景层：雪山图片 + 黑色遮罩 + 三组漂移光斑 + 噪点。
 * 结构与主站 GlobalBackground 保持一致：
 * - fixed 容器不参与滚动，避免移动端 background-attachment 行为差异
 * - 统一 -z-10 + pointer-events-none，不遮挡正文、不拦截点击
 */
export function GlobalBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <Image
        src="/matterhorn-bg.jpg"
        alt=""
        fill
        quality={90}
        priority
        unoptimized
        className="object-cover"
      />
      {/* 深色叠加层，确保文字可读 */}
      <div className="absolute inset-0 bg-black/60" />
      {/* 背景光斑（golden-dark-ui 标准氛围层） */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-blob-a" />
        <div className="bg-blob-b" />
        <div className="bg-blob-c" />
      </div>
      {/* 噪点层：柔化渐变色带 */}
      <div className="grain" />
    </div>
  );
}
