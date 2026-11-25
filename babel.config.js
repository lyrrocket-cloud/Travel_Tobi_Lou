// Babel 配置：仅在开发环境启用 react-dev-inspector 调试插件与 preset-react 开发模式，
// 生产构建不再注入 data-inspector-* 源码路径/行号属性。
module.exports = function (api) {
  const isDev = api.env('development');
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: [
      [
        'next/babel',
        {
          'preset-react': {
            development: isDev,
          },
        },
      ],
    ],
    plugins: isDev ? ['@react-dev-inspector/babel-plugin'] : [],
  };
};
