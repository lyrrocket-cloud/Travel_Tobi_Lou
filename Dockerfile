# ============ 构建阶段 ============
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 元数据
COPY package.json package-lock.json* ./

# 去掉只允许 pnpm 的 preinstall 钩子（Docker 构建用 npm）
RUN node -e "const p=require('./package.json'); delete p.scripts.preinstall; delete p.packageManager; require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2))"

# 安装所有依赖（含 dev），使用国内镜像加速
RUN npm install --registry=https://registry.npmmirror.com --no-audit --no-fund

# 复制源代码
COPY . .

# 将 next.config.ts 转换为纯 JS（运行时不需要 TS runtime，避免启动时动态安装 typescript）
# 同时移除 babel 配置：生产构建无需 react-dev-inspector 插件，交给 SWC/Turbopack 编译更快
RUN rm -f next.config.ts babel.config.js .babelrc && cat > next.config.js <<'EOF'
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
EOF

# 构建 Next.js 生产产物
RUN npx next build

# 裁剪掉 devDependencies
RUN npm prune --omit=dev

# ============ 运行阶段 ============
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 复制运行时需要的文件
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/postcss.config.mjs ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/components.json ./

# 创建数据持久化目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "node_modules/.bin/next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
